import prisma from "../db.server";

export interface StoreProfileData {
  storeName?: string;
  industry?: string;
  targetAudience?: string;
  storeDescription?: string;
}

export async function getStoreProfile(shop: string) {
  const profile = await prisma.storeProfile.findUnique({ where: { shop } });
  return (
    profile ?? {
      shop,
      storeName: "",
      industry: "",
      targetAudience: "",
      storeDescription: "",
    }
  );
}

export async function updateStoreProfile(
  shop: string,
  data: StoreProfileData,
) {
  return prisma.storeProfile.upsert({
    where: { shop },
    update: data,
    create: { shop, ...data },
  });
}
