import { Cecos } from './Cecos';

export interface ICecosRepository {
    save(cecos: Cecos): Promise<void>;
    findById(id: string): Promise<Cecos | null>;
    findAll(): Promise<Cecos[]>;
    delete(id: string): Promise<void>;
}
