/**
 * Player Shop Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Servicio principal para el mercado de jugadores.
 * Maneja listings, compras, pujas y entregas.
 */

import { Collection, ObjectId, ClientSession } from 'mongodb';
import { User, Pokemon, PCBox } from '../../shared/types/user.types.js';
import {
  Listing,
  ListingPokemon,
  ListingFilters,
  PaginatedListings,
  ListingDetail,
  CreateListingOptions,
  Bid,
  BidResult,
  PendingDelivery,
  PurchaseResult,
  AUCTION_CONFIG,
  PRICE_LIMITS,
} from '../../shared/types/player-shop.types.js';
import { PitufipuntosService } from './pitufipuntos.service.js';
import { TransactionManager } from '../../shared/utils/transaction-manager.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';

export class PlayerShopService {
  private pitufipuntosService: PitufipuntosService;

  constructor(
    private usersCollection: Collection<User>,
    private listingsCollection: Collection<Listing>,
    private bidsCollection: Collection<Bid>,
    private deliveriesCollection: Collection<PendingDelivery>,
    private transactionManager: TransactionManager
  ) {
    this.pitufipuntosService = new PitufipuntosService();
  }

  // ============================================
  // LISTING MANAGEMENT
  // ============================================

  /**
   * Crea un nuevo listing
   */
  async createListing(
    sellerId: string,
    pokemonUuid: string,
    options: CreateListingOptions
  ): Promise<Listing> {
    // Validar opciones
    this.validateListingOptions(options);

    return await this.transactionManager.executeTransaction(async (session) => {
      // 1. Obtener usuario y verificar que existe
      const user = await this.usersCollection.findOne(
        { minecraftUuid: sellerId },
        { session }
      );

      if (!user) {
        throw Errors.playerNotFound();
      }

      // 2. Buscar el Pokémon en party o PC
      const { pokemon, location } = this.findPokemonInStorage(user, pokemonUuid);

      if (!pokemon) {
        throw new AppError('POKEMON_NOT_FOUND', 'Pokémon no encontrado en tu almacenamiento', 404);
      }

      // 3. Verificar que no está ya en escrow (listado)
      const existingListing = await this.listingsCollection.findOne(
        { 'pokemon.uuid': pokemonUuid, status: 'active' },
        { session }
      );

      if (existingListing) {
        throw new AppError('POKEMON_IN_ESCROW', 'Este Pokémon ya está listado en el mercado', 400);
      }

      // 4. Crear snapshot del Pokémon para el listing
      const listingPokemon: ListingPokemon = {
        uuid: pokemon.uuid,
        species: pokemon.species,
        speciesId: pokemon.speciesId,
        nickname: pokemon.nickname,
        level: pokemon.level,
        shiny: pokemon.shiny,
        gender: pokemon.gender,
        nature: pokemon.nature,
        ability: pokemon.ability,
        ivs: { ...pokemon.ivs },
        evs: { ...pokemon.evs },
        moves: [...pokemon.moves],
        ball: pokemon.ball,
        form: pokemon.form,
        originalTrainer: pokemon.originalTrainer,
      };

      // 5. Calcular Pitufipuntos
      const pitufipuntos = this.pitufipuntosService.calculate(listingPokemon);

      // 6. Crear el listing
      const now = new Date();
      const listing: Listing = {
        sellerId,
        sellerUsername: user.minecraftUsername || user.nickname || 'Unknown',
        pokemon: listingPokemon,
        pitufipuntos,
        saleMethod: options.saleMethod,
        bidCount: 0,
        createdAt: now,
        status: 'active',
        viewCount: 0,
      };

      if (options.saleMethod === 'direct') {
        listing.price = options.price;
      } else {
        listing.startingBid = options.startingBid;
        listing.currentBid = options.startingBid;
        listing.duration = options.duration;
        listing.expiresAt = new Date(now.getTime() + (options.duration! * 60 * 60 * 1000));
      }

      // 7. Insertar listing
      const result = await this.listingsCollection.insertOne(listing as any, { session });
      listing._id = result.insertedId;

      // 8. Marcar Pokémon como en escrow (remover de storage del usuario)
      await this.removePokemonFromStorage(user, pokemonUuid, location, session);

      console.log(`[PLAYER SHOP] Listing created: ${listing._id} by ${sellerId}`);

      return listing;
    });
  }

  /**
   * Obtiene listings activos con filtros
   */
  async getActiveListings(filters: ListingFilters): Promise<PaginatedListings> {
    const query: any = { status: 'active' };

    // Aplicar filtros
    if (filters.species) {
      query['pokemon.species'] = { $regex: filters.species, $options: 'i' };
    }
    if (filters.speciesId) {
      query['pokemon.speciesId'] = filters.speciesId;
    }
    if (filters.shinyOnly) {
      query['pokemon.shiny'] = true;
    }
    if (filters.saleMethod) {
      query.saleMethod = filters.saleMethod;
    }

    // Filtro de precio
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceQuery: any = {};
      if (filters.minPrice !== undefined) {
        priceQuery.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        priceQuery.$lte = filters.maxPrice;
      }
      // Aplicar a price (direct) o currentBid (bidding)
      query.$or = [
        { saleMethod: 'direct', price: priceQuery },
        { saleMethod: 'bidding', currentBid: priceQuery },
      ];
    }

    // Ordenamiento
    const sortField = this.getSortField(filters.sortBy || 'createdAt');
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Ejecutar query
    const [listings, total] = await Promise.all([
      this.listingsCollection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.listingsCollection.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      listings,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Obtiene detalle de un listing
   */
  async getListing(listingId: string): Promise<ListingDetail> {
    const listing = await this.listingsCollection.findOne({
      _id: new ObjectId(listingId),
    });

    if (!listing) {
      throw new AppError('LISTING_NOT_FOUND', 'Listing no encontrado', 404);
    }

    // Incrementar contador de vistas
    await this.listingsCollection.updateOne(
      { _id: listing._id },
      { $inc: { viewCount: 1 } }
    );

    // Calcular tiempo restante para subastas
    let timeRemaining: number | undefined;
    if (listing.saleMethod === 'bidding' && listing.expiresAt) {
      timeRemaining = Math.max(0, listing.expiresAt.getTime() - Date.now());
    }

    // Verificar si el vendedor está online
    const seller = await this.usersCollection.findOne({ minecraftUuid: listing.sellerId });
    const sellerOnline = seller?.minecraftOnline || false;

    return {
      ...listing,
      timeRemaining,
      sellerOnline,
    };
  }

  /**
   * Obtiene listings de un usuario
   */
  async getMyListings(userId: string): Promise<Listing[]> {
    return await this.listingsCollection
      .find({ sellerId: userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Cancela un listing
   */
  async cancelListing(listingId: string, userId: string): Promise<void> {
    return await this.transactionManager.executeTransaction(async (session) => {
      const listing = await this.listingsCollection.findOne(
        { _id: new ObjectId(listingId) },
        { session }
      );

      if (!listing) {
        throw new AppError('LISTING_NOT_FOUND', 'Listing no encontrado', 404);
      }

      if (listing.sellerId !== userId) {
        throw new AppError('NOT_LISTING_OWNER', 'No eres el dueño de este listing', 403);
      }

      if (listing.status !== 'active') {
        throw new AppError('LISTING_NOT_ACTIVE', 'Este listing ya no está activo', 400);
      }

      // No permitir cancelar subastas con pujas
      if (listing.saleMethod === 'bidding' && listing.bidCount > 0) {
        throw new AppError('CANNOT_CANCEL_WITH_BIDS', 'No puedes cancelar una subasta con pujas activas', 400);
      }

      // Actualizar estado del listing
      await this.listingsCollection.updateOne(
        { _id: listing._id },
        { $set: { status: 'cancelled' } },
        { session }
      );

      // Crear entrega pendiente para devolver el Pokémon
      await this.createPendingDelivery(
        listing.sellerId,
        listing.sellerUsername,
        listing.pokemon as any,
        'escrow_return',
        listing._id,
        session
      );

      console.log(`[PLAYER SHOP] Listing cancelled: ${listingId} by ${userId}`);
    });
  }

  // ============================================
  // PURCHASE SYSTEM
  // ============================================

  /**
   * Compra directa de un listing
   */
  async purchaseDirect(listingId: string, buyerId: string): Promise<PurchaseResult> {
    return await this.transactionManager.executeTransaction(async (session) => {
      // 1. Obtener listing
      const listing = await this.listingsCollection.findOne(
        { _id: new ObjectId(listingId), status: 'active', saleMethod: 'direct' },
        { session }
      );

      if (!listing) {
        throw new AppError('LISTING_NOT_FOUND', 'Listing no encontrado o no disponible', 404);
      }

      // 2. Verificar que no es el propio vendedor
      if (listing.sellerId === buyerId) {
        throw new AppError('CANNOT_BUY_OWN_LISTING', 'No puedes comprar tu propio listing', 400);
      }

      // 3. Obtener comprador y verificar balance
      const buyer = await this.usersCollection.findOne(
        { minecraftUuid: buyerId },
        { session }
      );

      if (!buyer) {
        throw Errors.playerNotFound();
      }

      const price = listing.price!;
      if ((buyer.cobbleDollarsBalance || 0) < price) {
        throw Errors.insufficientBalance();
      }

      // 4. Obtener vendedor
      const seller = await this.usersCollection.findOne(
        { minecraftUuid: listing.sellerId },
        { session }
      );

      if (!seller) {
        throw new AppError('SELLER_NOT_FOUND', 'Vendedor no encontrado', 404);
      }

      // 5. Transferir fondos
      const newBuyerBalance = (buyer.cobbleDollarsBalance || 0) - price;
      const newSellerBalance = (seller.cobbleDollarsBalance || 0) + price;

      await this.usersCollection.updateOne(
        { minecraftUuid: buyerId },
        { $set: { cobbleDollarsBalance: newBuyerBalance, updatedAt: new Date() } },
        { session }
      );

      await this.usersCollection.updateOne(
        { minecraftUuid: listing.sellerId },
        { $set: { cobbleDollarsBalance: newSellerBalance, updatedAt: new Date() } },
        { session }
      );

      // 6. Actualizar listing
      await this.listingsCollection.updateOne(
        { _id: listing._id },
        {
          $set: {
            status: 'sold',
            soldAt: new Date(),
            buyerId,
            buyerUsername: buyer.minecraftUsername || buyer.nickname || 'Unknown',
            finalPrice: price,
          },
        },
        { session }
      );

      // 7. Crear entrega pendiente
      const delivery = await this.createPendingDelivery(
        buyerId,
        buyer.minecraftUsername || buyer.nickname || 'Unknown',
        listing.pokemon as any,
        'purchase',
        listing._id,
        session
      );

      console.log(`[PLAYER SHOP] Direct purchase: ${listingId} by ${buyerId} for ${price}`);

      return {
        success: true,
        listing: { ...listing, status: 'sold', finalPrice: price },
        newBuyerBalance,
        newSellerBalance,
        deliveryId: delivery._id?.toString(),
        message: `¡Compra exitosa! ${listing.pokemon.species} será entregado cuando estés online.`,
      };
    });
  }

  // ============================================
  // BIDDING SYSTEM
  // ============================================

  /**
   * Coloca una puja en una subasta
   */
  async placeBid(listingId: string, bidderId: string, amount: number): Promise<BidResult> {
    return await this.transactionManager.executeTransaction(async (session) => {
      // 1. Obtener listing
      const listing = await this.listingsCollection.findOne(
        { _id: new ObjectId(listingId), status: 'active', saleMethod: 'bidding' },
        { session }
      );

      if (!listing) {
        throw new AppError('LISTING_NOT_FOUND', 'Subasta no encontrada o no disponible', 404);
      }

      // 2. Verificar que no ha expirado
      if (listing.expiresAt && listing.expiresAt < new Date()) {
        throw new AppError('AUCTION_ENDED', 'Esta subasta ya ha terminado', 400);
      }

      // 3. Verificar que no es el propio vendedor
      if (listing.sellerId === bidderId) {
        throw new AppError('CANNOT_BID_OWN_LISTING', 'No puedes pujar en tu propia subasta', 400);
      }

      // 4. Verificar monto mínimo (5% más que la puja actual)
      const currentBid = listing.currentBid || listing.startingBid || 0;
      const minBid = Math.ceil(currentBid * (1 + AUCTION_CONFIG.MIN_BID_INCREMENT_PERCENT / 100));

      if (amount < minBid) {
        throw new AppError('BID_TOO_LOW', `La puja mínima es ${minBid} CobbleDollars (+5%)`, 400);
      }

      // 5. Obtener pujador y verificar balance
      const bidder = await this.usersCollection.findOne(
        { minecraftUuid: bidderId },
        { session }
      );

      if (!bidder) {
        throw Errors.playerNotFound();
      }

      if ((bidder.cobbleDollarsBalance || 0) < amount) {
        throw Errors.insufficientBalance();
      }

      // 6. Si hay pujador anterior, devolver sus fondos
      let previousBidder: BidResult['previousBidder'];
      if (listing.currentBidderId && listing.currentBidderId !== bidderId) {
        const prevBid = await this.bidsCollection.findOne(
          { listingId: listing._id, bidderId: listing.currentBidderId, status: 'active' },
          { session }
        );

        if (prevBid) {
          // Devolver fondos al pujador anterior
          await this.usersCollection.updateOne(
            { minecraftUuid: listing.currentBidderId },
            { $inc: { cobbleDollarsBalance: prevBid.amount } },
            { session }
          );

          // Marcar puja anterior como outbid
          await this.bidsCollection.updateOne(
            { _id: prevBid._id },
            { $set: { status: 'outbid' } },
            { session }
          );

          previousBidder = {
            uuid: listing.currentBidderId,
            username: listing.currentBidderUsername || 'Unknown',
            refundedAmount: prevBid.amount,
          };
        }
      }

      // 7. Reservar fondos del nuevo pujador
      const newBidderBalance = (bidder.cobbleDollarsBalance || 0) - amount;
      await this.usersCollection.updateOne(
        { minecraftUuid: bidderId },
        { $set: { cobbleDollarsBalance: newBidderBalance, updatedAt: new Date() } },
        { session }
      );

      // 8. Crear registro de puja
      const bid: Bid = {
        listingId: listing._id!,
        bidderId,
        bidderUsername: bidder.minecraftUsername || bidder.nickname || 'Unknown',
        amount,
        reservedFromBalance: true,
        createdAt: new Date(),
        status: 'active',
      };

      const bidResult = await this.bidsCollection.insertOne(bid as any, { session });
      bid._id = bidResult.insertedId;

      // 9. Actualizar listing
      await this.listingsCollection.updateOne(
        { _id: listing._id },
        {
          $set: {
            currentBid: amount,
            currentBidderId: bidderId,
            currentBidderUsername: bid.bidderUsername,
          },
          $inc: { bidCount: 1 },
        },
        { session }
      );

      console.log(`[PLAYER SHOP] Bid placed: ${amount} on ${listingId} by ${bidderId}`);

      return {
        success: true,
        bid,
        newBalance: newBidderBalance,
        message: `¡Puja exitosa! Ahora eres el mayor postor con ${amount} CobbleDollars.`,
        previousBidder,
      };
    });
  }

  /**
   * Obtiene historial de pujas de un listing
   */
  async getBidHistory(listingId: string): Promise<Bid[]> {
    return await this.bidsCollection
      .find({ listingId: new ObjectId(listingId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Procesa subastas expiradas
   */
  async processExpiredAuctions(): Promise<void> {
    const expiredListings = await this.listingsCollection
      .find({
        status: 'active',
        saleMethod: 'bidding',
        expiresAt: { $lte: new Date() },
      })
      .toArray();

    for (const listing of expiredListings) {
      try {
        await this.completeAuction(listing);
      } catch (error) {
        console.error(`[PLAYER SHOP] Error processing auction ${listing._id}:`, error);
      }
    }
  }

  /**
   * Completa una subasta
   */
  private async completeAuction(listing: Listing): Promise<void> {
    await this.transactionManager.executeTransaction(async (session) => {
      if (listing.bidCount > 0 && listing.currentBidderId) {
        // Hay ganador
        const winner = await this.usersCollection.findOne(
          { minecraftUuid: listing.currentBidderId },
          { session }
        );

        const seller = await this.usersCollection.findOne(
          { minecraftUuid: listing.sellerId },
          { session }
        );

        if (winner && seller) {
          // Transferir fondos al vendedor (ya fueron reservados del comprador)
          const finalPrice = listing.currentBid!;
          await this.usersCollection.updateOne(
            { minecraftUuid: listing.sellerId },
            { $inc: { cobbleDollarsBalance: finalPrice } },
            { session }
          );

          // Actualizar listing
          await this.listingsCollection.updateOne(
            { _id: listing._id },
            {
              $set: {
                status: 'sold',
                soldAt: new Date(),
                buyerId: listing.currentBidderId,
                buyerUsername: listing.currentBidderUsername,
                finalPrice,
              },
            },
            { session }
          );

          // Marcar puja ganadora
          await this.bidsCollection.updateOne(
            { listingId: listing._id, bidderId: listing.currentBidderId, status: 'active' },
            { $set: { status: 'won' } },
            { session }
          );

          // Crear entrega pendiente
          await this.createPendingDelivery(
            listing.currentBidderId,
            listing.currentBidderUsername || 'Unknown',
            listing.pokemon as any,
            'auction_win',
            listing._id,
            session
          );

          console.log(`[PLAYER SHOP] Auction completed: ${listing._id} won by ${listing.currentBidderId}`);
        }
      } else {
        // Sin pujas - devolver al vendedor
        await this.listingsCollection.updateOne(
          { _id: listing._id },
          { $set: { status: 'expired' } },
          { session }
        );

        await this.createPendingDelivery(
          listing.sellerId,
          listing.sellerUsername,
          listing.pokemon as any,
          'escrow_return',
          listing._id,
          session
        );

        console.log(`[PLAYER SHOP] Auction expired without bids: ${listing._id}`);
      }
    });
  }

  // ============================================
  // DELIVERY SYSTEM
  // ============================================

  /**
   * Obtiene entregas pendientes para un jugador
   * Busca por recipientUuid O buyerUuid para compatibilidad con diferentes flujos
   */
  async getPendingDeliveries(playerUuid: string): Promise<PendingDelivery[]> {
    return await this.deliveriesCollection
      .find({ 
        $or: [
          { recipientUuid: playerUuid },
          { buyerUuid: playerUuid }
        ],
        status: 'pending' 
      })
      .toArray();
  }

  /**
   * Marca una entrega como completada
   */
  async markDelivered(deliveryId: string): Promise<void> {
    const result = await this.deliveriesCollection.updateOne(
      { _id: new ObjectId(deliveryId), status: 'pending' },
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new AppError('DELIVERY_NOT_FOUND', 'Entrega no encontrada o ya procesada', 404);
    }

    console.log(`[PLAYER SHOP] Delivery marked as completed: ${deliveryId}`);
  }

  /**
   * Crea una entrega pendiente
   */
  private async createPendingDelivery(
    recipientUuid: string,
    recipientUsername: string,
    pokemon: Pokemon,
    type: PendingDelivery['type'],
    sourceListingId: ObjectId | undefined,
    session: ClientSession
  ): Promise<PendingDelivery> {
    const delivery: PendingDelivery = {
      recipientUuid,
      recipientUsername,
      type,
      pokemon,
      sourceListingId,
      createdAt: new Date(),
      status: 'pending',
      deliveryAttempts: 0,
    };

    const result = await this.deliveriesCollection.insertOne(delivery as any, { session });
    delivery._id = result.insertedId;

    return delivery;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Valida opciones de listing
   */
  private validateListingOptions(options: CreateListingOptions): void {
    if (options.saleMethod === 'direct') {
      if (!options.price || options.price < PRICE_LIMITS.MIN || options.price > PRICE_LIMITS.MAX) {
        throw new AppError('INVALID_PRICE', `Precio debe estar entre ${PRICE_LIMITS.MIN} y ${PRICE_LIMITS.MAX.toLocaleString()}`, 400);
      }
    } else if (options.saleMethod === 'bidding') {
      if (!options.startingBid || options.startingBid < PRICE_LIMITS.MIN) {
        throw new AppError('INVALID_STARTING_BID', `Puja inicial mínima es ${PRICE_LIMITS.MIN}`, 400);
      }
      if (!options.duration || options.duration < AUCTION_CONFIG.MIN_DURATION_HOURS || options.duration > AUCTION_CONFIG.MAX_DURATION_HOURS) {
        throw new AppError('INVALID_DURATION', `Duración debe estar entre ${AUCTION_CONFIG.MIN_DURATION_HOURS} y ${AUCTION_CONFIG.MAX_DURATION_HOURS} horas`, 400);
      }
    }
  }

  /**
   * Busca un Pokémon en el almacenamiento del usuario
   */
  private findPokemonInStorage(
    user: User,
    pokemonUuid: string
  ): { pokemon: Pokemon | null; location: 'party' | 'pc' | null } {
    // Buscar en party
    const partyPokemon = user.pokemonParty?.find(p => p.uuid === pokemonUuid);
    if (partyPokemon) {
      return { pokemon: partyPokemon, location: 'party' };
    }

    // Buscar en PC
    for (const box of user.pcStorage || []) {
      const pcPokemon = box.pokemon?.find(p => p?.uuid === pokemonUuid);
      if (pcPokemon) {
        return { pokemon: pcPokemon, location: 'pc' };
      }
    }

    return { pokemon: null, location: null };
  }

  /**
   * Remueve un Pokémon del almacenamiento del usuario
   */
  private async removePokemonFromStorage(
    user: User,
    pokemonUuid: string,
    location: 'party' | 'pc',
    session: ClientSession
  ): Promise<void> {
    if (location === 'party') {
      const newParty = user.pokemonParty?.filter(p => p.uuid !== pokemonUuid) || [];
      await this.usersCollection.updateOne(
        { minecraftUuid: user.minecraftUuid },
        { $set: { pokemonParty: newParty, updatedAt: new Date() } },
        { session }
      );
    } else {
      const newPcStorage = user.pcStorage?.map(box => ({
        ...box,
        pokemon: box.pokemon?.filter(p => p?.uuid !== pokemonUuid) || [],
      })) || [];
      await this.usersCollection.updateOne(
        { minecraftUuid: user.minecraftUuid },
        { $set: { pcStorage: newPcStorage, updatedAt: new Date() } },
        { session }
      );
    }
  }

  /**
   * Obtiene el campo de ordenamiento
   */
  private getSortField(sortBy: string): string {
    switch (sortBy) {
      case 'pitufipuntos':
        return 'pitufipuntos.total';
      case 'price':
        return 'price';
      case 'expiresAt':
        return 'expiresAt';
      default:
        return 'createdAt';
    }
  }
}
