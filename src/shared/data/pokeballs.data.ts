/**
 * Datos de Pokéballs
 * Cobblemon Los Pitufos - Backend API
 * 
 * Catálogo completo de Pokéballs disponibles en la tienda
 */

import type { Pokeball } from '../types/shop.types.js';

export { Pokeball } from '../types/shop.types.js';

export const POKEBALLS: Pokeball[] = [
    // Básicas (siempre disponibles)
    {
        id: 'poke_ball',
        name: 'Poké Ball',
        type: 'standard',
        catchRate: 1.0,
        basePrice: 200,
        description: 'La Pokébola básica para capturar Pokémon salvajes.',
        sprite: '/pokeballs/Poke Ball_model.png',
        minStock: 5,
        maxStock: 10
    },
    {
        id: 'great_ball',
        name: 'Great Ball',
        type: 'standard',
        catchRate: 1.5,
        basePrice: 600,
        description: 'Una Pokébola mejorada con mayor tasa de captura.',
        sprite: '/pokeballs/Great Ball_model.png',
        minStock: 3,
        maxStock: 8
    },
    {
        id: 'ultra_ball',
        name: 'Ultra Ball',
        type: 'standard',
        catchRate: 2.0,
        basePrice: 1200,
        description: 'Una Pokébola de alto rendimiento para capturas difíciles.',
        sprite: '/pokeballs/Ultra Ball_model.png',
        minStock: 2,
        maxStock: 5
    },

    // Especiales (rotativas)
    {
        id: 'premier_ball',
        name: 'Premier Ball',
        type: 'standard',
        catchRate: 1.0,
        basePrice: 400,
        description: 'Una Pokébola conmemorativa de apariencia elegante.',
        sprite: '/pokeballs/Premier Ball_model.png',
        minStock: 3,
        maxStock: 7
    },
    {
        id: 'luxury_ball',
        name: 'Luxury Ball',
        type: 'special',
        catchRate: 1.0,
        basePrice: 3000,
        description: 'Los Pokémon capturados se vuelven más amigables rápidamente.',
        sprite: '/pokeballs/Luxury Ball_model.png',
        minStock: 1,
        maxStock: 4
    },
    {
        id: 'quick_ball',
        name: 'Quick Ball',
        type: 'special',
        catchRate: 5.0,
        basePrice: 2800,
        description: 'Funciona mejor en el primer turno de batalla.',
        sprite: '/pokeballs/Quick Ball_model.png',
        minStock: 1,
        maxStock: 3
    },
    {
        id: 'dusk_ball',
        name: 'Dusk Ball',
        type: 'special',
        catchRate: 3.5,
        basePrice: 2400,
        description: 'Funciona mejor de noche o en cuevas.',
        sprite: '/pokeballs/Dusk Ball_model.png',
        minStock: 2,
        maxStock: 4
    },
    {
        id: 'timer_ball',
        name: 'Timer Ball',
        type: 'special',
        catchRate: 4.0,
        basePrice: 2100,
        description: 'Más efectiva conforme pasan los turnos.',
        sprite: '/pokeballs/Timer Ball_model.png',
        minStock: 2,
        maxStock: 4
    },
    {
        id: 'net_ball',
        name: 'Net Ball',
        type: 'special',
        catchRate: 3.5,
        basePrice: 1800,
        description: 'Funciona bien con Pokémon de tipo Agua y Bicho.',
        sprite: '/pokeballs/Net Ball_model.png',
        minStock: 2,
        maxStock: 5
    },
    {
        id: 'repeat_ball',
        name: 'Repeat Ball',
        type: 'special',
        catchRate: 3.5,
        basePrice: 1700,
        description: 'Funciona mejor con especies ya capturadas.',
        sprite: '/pokeballs/Repeat Ball_model.png',
        minStock: 2,
        maxStock: 5
    },
    {
        id: 'dive_ball',
        name: 'Dive Ball',
        type: 'special',
        catchRate: 3.5,
        basePrice: 1900,
        description: 'Funciona bien con Pokémon bajo el agua.',
        sprite: '/pokeballs/Dive Ball_model.png',
        minStock: 2,
        maxStock: 4
    },
    {
        id: 'heal_ball',
        name: 'Heal Ball',
        type: 'special',
        catchRate: 1.0,
        basePrice: 1500,
        description: 'Restaura la salud y el estado del Pokémon capturado.',
        sprite: '/pokeballs/Heal Ball_model.png',
        minStock: 3,
        maxStock: 6
    },
    {
        id: 'nest_ball',
        name: 'Nest Ball',
        type: 'special',
        catchRate: 8.0,
        basePrice: 1600,
        description: 'Funciona mejor con Pokémon de bajo nivel.',
        sprite: '/pokeballs/Nest Ball_model.png',
        minStock: 2,
        maxStock: 5
    },
    {
        id: 'safari_ball',
        name: 'Safari Ball',
        type: 'special',
        catchRate: 1.5,
        basePrice: 3500,
        description: 'Una Pokébola especial usada en la Zona Safari.',
        sprite: '/pokeballs/Safari Ball_model.png',
        minStock: 1,
        maxStock: 3
    },
    {
        id: 'dream_ball',
        name: 'Dream Ball',
        type: 'special',
        catchRate: 4.0,
        basePrice: 4500,
        description: 'Funciona bien con Pokémon dormidos.',
        sprite: '/pokeballs/Dream Ball_model.png',
        minStock: 1,
        maxStock: 2
    },
    {
        id: 'beast_ball',
        name: 'Beast Ball',
        type: 'special',
        catchRate: 5.0,
        basePrice: 8000,
        description: 'Diseñada para capturar Ultraentes.',
        sprite: '/pokeballs/Beast Ball_model.png',
        minStock: 0,
        maxStock: 2
    },

    // ULTRA RARA
    {
        id: 'master_ball',
        name: 'Master Ball',
        type: 'special',
        catchRate: 255.0,
        basePrice: 100000,
        description: '¡Captura CUALQUIER Pokémon sin fallar! ULTRA RARA.',
        sprite: '/pokeballs/Master Ball_model.png',
        minStock: 0,
        maxStock: 1
    }
];

export function getRandomStock(ball: Pokeball): number {
    return Math.floor(Math.random() * (ball.maxStock - ball.minStock + 1)) + ball.minStock;
}

export function getPriceWithStock(basePrice: number, stock: number, maxStock: number): number {
    const stockRatio = stock / maxStock;
    if (stockRatio < 0.1) return Math.floor(basePrice * 3.0);
    if (stockRatio < 0.25) return Math.floor(basePrice * 2.0);
    if (stockRatio < 0.5) return Math.floor(basePrice * 1.5);
    return basePrice;
}
