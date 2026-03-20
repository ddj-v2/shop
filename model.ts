import { db, UserModel } from 'hydrooj';

const collcoin = db.collection('coin');  
const collgoods = db.collection('goods'); 

interface Bill {
    _id: ObjectId;
    userId: number;
    rootId: number;
    amount: number;
    text: string;
    status: number;
}

export interface Goods {
    _id: number;
    objectId?: string;
    redirectUrl?: string;
    purchaseModelId?: string;
    data?: Record<string, unknown>;
    name: string;
    description?: string;
    price: number;
    num: number;
}

export interface GoodsPurchaseModel {
    purchase(uid: number, goods: Goods, amount: number):
        | Promise<boolean | { success: boolean; message?: string }>
        | (boolean | { success: boolean; message?: string });
}

declare module 'hydrooj' {
    interface Model {
        coin: typeof CoinModel;
        goods: typeof GoodsModel;
    }
    interface Collections {
        bill: Bill;
        goods: Goods;
    }
}

class CoinModel {
    static coll = collcoin;

    static async inc(userId: number, rootId: number, amount: number, text: string, asset: number, status?: number) {
        await CoinModel.coll.insertOne({ userId, rootId, amount, text, ...(status !== undefined && { status }) });
        await UserModel.inc(userId, 'coin_now', amount);
        if (amount > 0 && asset === 1) {  //如果asset==1则计入总资产
            await UserModel.inc(userId, 'coin_all', amount);
        }
    }

    static async getUserBill(userId: number) {
        const query = userId === 0 ? {} : { userId };
        return CoinModel.coll.find(query).sort({ _id: -1 });
    }

    static async getUserRecord(userId: number) {
        const query = userId === 0 ? { status: { $gte: 0 } } : { userId, status: { $gte: 0 } };
        return CoinModel.coll.find(query).sort({ status: -1, _id: -1 });
    }

    static async getBill(billId: string): Promise<Bill> {
        return CoinModel.coll.findOne({ _id: billId });
    }

    static async deleteBill(billId: string): Promise<number> {
        const result = await CoinModel.coll.deleteOne({ _id: billId });
        return result.deletedCount;
    }

    static async updateBill(id: string, update: Partial<Bill>): Promise<number> {  
        const result = await CoinModel.coll.updateOne({ _id: id }, { $set: update });  
        return result.modifiedCount;  
    }
}

class GoodsModel {
    static coll = collgoods;

    static async add(
        name: string,
        price: number,
        num: number,
        objectId = '',
        goodsId?: number,
        purchaseModelId = '',
        data?: Record<string, unknown>,
        description = '',
        redirectUrl = '',
    ) {
        if (typeof goodsId !== 'number') {
            const [goods] = await GoodsModel.coll.find({}).sort({ _id: -1 }).limit(1).toArray();
            goodsId = Math.max((goods?._id || 0) + 1, 1);
        }
        const result = await GoodsModel.coll.insertOne({
            _id: goodsId,
            objectId,
            redirectUrl,
            purchaseModelId,
            data,
            name,
            description,
            price,
            num,
        });
        return result.insertedId;
    }

    static async getMulti(): Promise<Goods[]> {
        return GoodsModel.coll.find({});
    }

    static async get(goodsId: number): Promise<Goods> {
        return GoodsModel.coll.findOne({ _id: goodsId });
    }

    static async getByObjectId(objectId: string): Promise<Goods | null> {
        return GoodsModel.coll.findOne({ objectId });
    }

    static async getMultiByObjectId(objectId: string) {
        return GoodsModel.coll.find({ objectId });
    }

    static async edit(
        goodsId: number,
        name: string,
        price: number,
        num: number,
        objectId = '',
        purchaseModelId?: string,
        data?: Record<string, unknown>,
        description?: string,
        redirectUrl = '',
    ): Promise<number> {
        const $set: Record<string, unknown> = { name, price, num, objectId, redirectUrl };
        if (typeof purchaseModelId === 'string') $set.purchaseModelId = purchaseModelId;
        if (data !== undefined) $set.data = data;
        if (description !== undefined) $set.description = description;
        const result = await GoodsModel.coll.updateOne(
            { _id: goodsId },
            { $set }
        );
        return result.modifiedCount;
    }

    static async delete(goodsId: number): Promise<number> {
        const result = await GoodsModel.coll.deleteOne({ _id: goodsId });
        return result.deletedCount;
    }

    static async updateStock(goodsId: number, delta: number): Promise<number> {
        const filter: Record<string, unknown> = { _id: goodsId, num: { $gte: 0 } };
        if (delta < 0) filter.num = { $gte: -delta };
        const result = await GoodsModel.coll.updateOne(
            filter,
            { $inc: { num: delta } }
        );
        return result.modifiedCount;
    }
}

global.Hydro.model.coin = CoinModel;
global.Hydro.model.goods = GoodsModel;

export { CoinModel, GoodsModel };