import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getDb, nowIso } from "./firebase-db";

const EDITORS_PICKS_COLLECTION = "editors_picks";
const PRODUCTS_COLLECTION = "products";

export type PickWithProduct = {
  pickId: number;
  position: number;
  product: {
    id: number;
    storeSlug: string;
    storeName: string;
    title: string;
    price: number;
    image: string | null;
    images: string | null;
    size: string | null;
    externalUrl: string | null;
  };
};

type EditorsPickDoc = {
  product_id: number;
  position: number;
  added_at: string;
};

type ProductDoc = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  image: string | null;
  images: string | null;
  size: string | null;
  external_url: string | null;
};

type ProductResult = {
  id: number;
  storeSlug: string;
  storeName: string;
  title: string;
  price: number;
  image: string | null;
};

function numberValue(input: unknown): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}

function mapProduct(data: Partial<ProductDoc>): ProductDoc {
  return {
    id: numberValue(data.id),
    store_slug: typeof data.store_slug === "string" ? data.store_slug : "",
    store_name: typeof data.store_name === "string" ? data.store_name : "",
    title: typeof data.title === "string" ? data.title : "",
    price: numberValue(data.price),
    image: typeof data.image === "string" ? data.image : null,
    images: typeof data.images === "string" ? data.images : null,
    size: typeof data.size === "string" ? data.size : null,
    external_url: typeof data.external_url === "string" ? data.external_url : null,
  };
}

function mapProductResult(data: ProductDoc): ProductResult {
  return {
    id: data.id,
    storeSlug: data.store_slug,
    storeName: data.store_name,
    title: data.title,
    price: data.price,
    image: data.image,
  };
}

async function getAllProductDocs(): Promise<ProductDoc[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCTS_COLLECTION));

  return snaps.docs
    .map((snap) => mapProduct(snap.data() as Partial<ProductDoc>))
    .filter((row) => row.id > 0 && !!row.store_slug && !!row.title);
}

export async function initEditorsPicks(): Promise<void> {
  // Firestore collections are created implicitly.
}

export async function getAllEditorsPicks(): Promise<PickWithProduct[]> {
  await initEditorsPicks();
  const db = getDb();

  const [pickSnaps, products] = await Promise.all([
    getDocs(collection(db, EDITORS_PICKS_COLLECTION)),
    getAllProductDocs(),
  ]);

  const productsById = new Map<number, ProductDoc>();
  for (const product of products) {
    productsById.set(product.id, product);
  }

  const picks: PickWithProduct[] = [];
  for (const snap of pickSnaps.docs) {
    const row = snap.data() as Partial<EditorsPickDoc>;
    const productId = numberValue(row.product_id) || numberValue(snap.id);
    const position = numberValue(row.position);
    const product = productsById.get(productId);
    if (!product) continue;

    picks.push({
      pickId: productId,
      position,
      product: {
        id: product.id,
        storeSlug: product.store_slug,
        storeName: product.store_name,
        title: product.title,
        price: product.price,
        image: product.image,
        images: product.images,
        size: product.size,
        externalUrl: product.external_url,
      },
    });
  }

  return picks.sort((a, b) => a.position - b.position);
}

export async function addEditorsPick(productId: number): Promise<void> {
  await initEditorsPicks();
  const db = getDb();

  const productRef = doc(collection(db, PRODUCTS_COLLECTION), String(productId));
  const productSnap = await getDoc(productRef);
  if (!productSnap.exists()) {
    // Product docs are keyed by store slug + title in this app.
    // Fall back to scanning by numeric id.
    const allProducts = await getAllProductDocs();
    const exists = allProducts.some((product) => product.id === productId);
    if (!exists) {
      throw new Error("Product not found");
    }
  }

  const pickRef = doc(collection(db, EDITORS_PICKS_COLLECTION), String(productId));
  const existing = await getDoc(pickRef);
  if (existing.exists()) return;

  const pickSnaps = await getDocs(collection(db, EDITORS_PICKS_COLLECTION));
  let maxPosition = -1;
  for (const snap of pickSnaps.docs) {
    const row = snap.data() as Partial<EditorsPickDoc>;
    const position = numberValue(row.position);
    if (position > maxPosition) maxPosition = position;
  }

  const payload: EditorsPickDoc = {
    product_id: productId,
    position: maxPosition + 1,
    added_at: nowIso(),
  };

  await setDoc(pickRef, payload);
}

export async function removeEditorsPick(productId: number): Promise<void> {
  await initEditorsPicks();
  const db = getDb();
  await deleteDoc(doc(collection(db, EDITORS_PICKS_COLLECTION), String(productId)));
}

export async function getProductsByStore(storeSlug: string, limit = 200): Promise<ProductResult[]> {
  const products = await getAllProductDocs();
  return products
    .filter((product) => product.store_slug === storeSlug)
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(mapProductResult);
}

export async function searchProducts(q: string, storeSlug?: string): Promise<ProductResult[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const products = await getAllProductDocs();
  return products
    .filter((product) => (storeSlug ? product.store_slug === storeSlug : true))
    .filter((product) => product.title.toLowerCase().includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 30)
    .map(mapProductResult);
}
