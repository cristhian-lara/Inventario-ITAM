import { Router } from 'express';
import { PostgresCustomListRepository } from '../../modules/master-data/infrastructure/PostgresCustomListRepository';
import { CustomListUseCases } from '../../modules/master-data/application/CustomListUseCases';

const masterDataRouter = Router();
const customListRepo = new PostgresCustomListRepository();
const useCases = new CustomListUseCases(customListRepo);

masterDataRouter.get('/custom-lists', async (req, res) => {
    try {
        const lists = await useCases.getAllLists();
        res.json(lists);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

masterDataRouter.get('/custom-lists/:code', async (req, res) => {
    try {
        const list = await useCases.getListByCode(req.params.code);
        if (!list) return res.status(404).json({ error: 'List not found' });
        res.json(list);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

masterDataRouter.post('/custom-lists', async (req, res) => {
    try {
        const { name, description, targetEntity } = req.body;
        const list = await useCases.createList(name, description, false, targetEntity);
        res.status(201).json(list);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

masterDataRouter.put('/custom-lists/:id', async (req, res) => {
    try {
        const { name, description, targetEntity } = req.body;
        const list = await useCases.updateList(req.params.id, name, description, targetEntity);
        res.json(list);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

masterDataRouter.delete('/custom-lists/:id', async (req, res) => {
    try {
        await useCases.deleteList(req.params.id);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

masterDataRouter.post('/custom-lists/:listId/items', async (req, res) => {
    try {
        const { value, description, orderIndex } = req.body;
        const item = await useCases.addItem(req.params.listId, value, description, orderIndex);
        res.status(201).json(item);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

masterDataRouter.put('/custom-lists/:listId/items/:itemId', async (req, res) => {
    try {
        const { value, description, orderIndex, isActive } = req.body;
        await useCases.updateItem(req.params.itemId, req.params.listId, value, description, orderIndex, isActive);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

masterDataRouter.delete('/custom-lists/:listId/items/:itemId', async (req, res) => {
    try {
        await useCases.deleteItem(req.params.itemId);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export { masterDataRouter };
