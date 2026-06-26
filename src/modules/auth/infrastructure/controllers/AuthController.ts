import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/LoginUseCase';

export class AuthController {
    constructor(private loginUseCase: LoginUseCase) {}

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                res.status(400).json({ error: 'Username y password son requeridos' });
                return;
            }

            const result = await this.loginUseCase.execute({ username, password });
            res.status(200).json(result);
        } catch (error: any) {
            if (error.message === 'Credenciales inválidas') {
                res.status(401).json({ error: error.message });
            } else {
                console.error('Error in login:', error);
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        }
    }
}
