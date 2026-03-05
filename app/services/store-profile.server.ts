import prisma from "../db.server";

export interface StoreProfileData {
  storeName?: string;
  industry?: string;
  targetAudience?: string;
  storeDescription?: string;
  briefingEmail?: string;
  briefingEnabled?: boolean;
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
      briefingEmail: null,
      briefingEnabled: false,
      briefingHour: 7,
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
