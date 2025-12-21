import { Request, Response } from 'express';
import { TournamentsService } from './tournaments.service.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';

export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  getAllTournaments = asyncHandler(async (req: Request, res: Response) => {
    const tournaments = await this.tournamentsService.getAllTournaments();
    res.json(tournaments);
  });

  getTournamentById = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.getTournamentById(req.params['id'] || '');
    res.json(tournament);
  });

  createTournament = asyncHandler(async (req: Request, res: Response) => {
    const createdBy = (req as any).user?.discordUsername || 'Admin';
    const tournament = await this.tournamentsService.createTournament(req.body, createdBy);
    res.json(tournament);
  });

  updateTournament = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.updateTournament(req.params['id'] || '', req.body);
    res.json(tournament);
  });

  deleteTournament = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.tournamentsService.deleteTournament(req.params['id'] || '');
    res.json(result);
  });
}
