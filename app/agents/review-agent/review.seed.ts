import prisma from "../../db.server";

interface SeedReview {
  productId: string;
  productTitle: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  reviewDate: Date;
}

const SEED_REVIEWS: SeedReview[] = [
  // --- Red Running Sneakers (sizing issues) ---
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "Mike T.", rating: 3, title: "Runs small!", body: "Love the look but had to exchange for a full size up. These run at least half a size small. Order bigger than your normal size.", verified: true, reviewDate: new Date("2026-02-15") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "Sarah L.", rating: 2, title: "Size is way off", body: "I'm usually a 7 and the 7 was painfully tight. Had to return and get 8. Very disappointed with sizing.", verified: true, reviewDate: new Date("2026-02-18") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "James K.", rating: 4, title: "Great shoe once you size up", body: "Amazing comfort and style. Just size up 0.5-1 size. I run 5K daily in these and they hold up great.", verified: true, reviewDate: new Date("2026-02-20") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "Emily R.", rating: 1, title: "Terrible sizing", body: "Ordered my usual size 9 and they fit like an 8. The return process was also slow. Would not recommend unless they fix their sizing chart.", verified: false, reviewDate: new Date("2026-02-22") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "David M.", rating: 5, title: "Perfect for running", body: "Got these a size up as other reviews suggested and they fit perfectly. Super lightweight and responsive. Best running shoes I've owned.", verified: true, reviewDate: new Date("2026-02-25") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "Lisa H.", rating: 3, title: "Runs small but decent quality", body: "The quality is good but these definitely run small. Had to exchange. Wish the product page warned about this.", verified: true, reviewDate: new Date("2026-03-01") },
  { productId: "gid://shopify/Product/1001", productTitle: "Red Running Sneakers", author: "Chris P.", rating: 4, title: "Comfortable after sizing up", body: "Sized up one full size and they're perfect. Breathable mesh, good arch support. The red color is vibrant.", verified: true, reviewDate: new Date("2026-03-03") },

  // --- Wireless Bluetooth Headphones (mostly positive, battery praise) ---
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Anna W.", rating: 5, title: "Incredible battery life", body: "I've been using these for 2 weeks and only charged twice. Sound quality is phenomenal for the price. Noise cancellation works great on flights.", verified: true, reviewDate: new Date("2026-02-10") },
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Tom B.", rating: 5, title: "Best headphones under $100", body: "Battery lasts forever. I use them 4-5 hours daily and charge maybe once a week. Bass is deep and mids are clear.", verified: true, reviewDate: new Date("2026-02-14") },
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Rachel G.", rating: 4, title: "Great sound, minor comfort issue", body: "Audio quality and battery are outstanding. Only issue is they get a bit uncomfortable after 3+ hours. Ear cups could be softer.", verified: true, reviewDate: new Date("2026-02-19") },
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Kevin N.", rating: 5, title: "Battery champion", body: "40+ hours battery is no joke. These headphones just keep going. Bluetooth connectivity is rock solid too.", verified: true, reviewDate: new Date("2026-02-23") },
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Maria S.", rating: 4, title: "Love the sound quality", body: "Crystal clear audio and the battery life is amazing. I wish they came in more colors though. Currently only black and white.", verified: false, reviewDate: new Date("2026-02-27") },
  { productId: "gid://shopify/Product/1002", productTitle: "Wireless Bluetooth Headphones", author: "Jason D.", rating: 5, title: "Worth every penny", body: "Switched from AirPods Max and honestly these are 90% as good at 1/3 the price. Battery destroys the competition.", verified: true, reviewDate: new Date("2026-03-02") },

  // --- Organic Cotton T-Shirt (quality great, color fades) ---
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Olivia F.", rating: 3, title: "Color faded after 3 washes", body: "The fabric feels amazing and the fit is great, but the navy color faded significantly after just 3 washes. Disappointed.", verified: true, reviewDate: new Date("2026-02-12") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Nathan J.", rating: 4, title: "Super soft but wash carefully", body: "Incredibly soft organic cotton. Best t-shirt I own for comfort. Just wash in cold water - mine faded a bit in warm wash.", verified: true, reviewDate: new Date("2026-02-16") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Sophie M.", rating: 5, title: "Eco-friendly and comfy", body: "Love that it's organic and sustainably made. The fit is true to size and the material is buttery soft. Will buy more colors.", verified: true, reviewDate: new Date("2026-02-21") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Brandon C.", rating: 2, title: "Fades terribly", body: "The black one turned grey after just 2 washes. The quality of the fabric is nice but what's the point if the color doesn't last?", verified: true, reviewDate: new Date("2026-02-24") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Hannah L.", rating: 4, title: "Comfortable everyday tee", body: "Bought 3 of these in different colors. White one is perfect. The darker colors do fade a little but the comfort is unmatched.", verified: true, reviewDate: new Date("2026-02-28") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Derek W.", rating: 3, title: "Mixed feelings", body: "Material is top notch, feels premium. But the dye quality needs work. My forest green tee looks like it's 2 years old after a month.", verified: false, reviewDate: new Date("2026-03-01") },
  { productId: "gid://shopify/Product/1003", productTitle: "Organic Cotton T-Shirt", author: "Amy Z.", rating: 5, title: "Best organic tee ever", body: "Finally a sustainable t-shirt that actually feels good. I hand wash mine and the color stays perfect. Highly recommend!", verified: true, reviewDate: new Date("2026-03-04") },

  // --- Stainless Steel Water Bottle (packaging complaints, product great) ---
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Ryan K.", rating: 4, title: "Great bottle, terrible packaging", body: "The bottle itself is excellent - keeps drinks cold 24hrs. But it arrived in a flimsy box with zero padding. Lucky it wasn't dented.", verified: true, reviewDate: new Date("2026-02-11") },
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Jessica P.", rating: 3, title: "Arrived dented", body: "Product quality seems great but mine arrived with a dent because of poor packaging. Had to request a replacement. Fix your shipping please!", verified: true, reviewDate: new Date("2026-02-17") },
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Mark A.", rating: 5, title: "Perfect insulation", body: "Ice stays frozen for over a day. This bottle is a beast. No condensation on the outside either. Best water bottle I've owned.", verified: true, reviewDate: new Date("2026-02-22") },
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Lauren T.", rating: 2, title: "Packaging needs serious work", body: "Second bottle I ordered. First one arrived damaged due to awful packaging. Replacement came in same bad packaging but luckily survived. The actual bottle is 5 stars.", verified: true, reviewDate: new Date("2026-02-26") },
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Carlos R.", rating: 5, title: "Keeps hot drinks hot too!", body: "My coffee stays hot for 8+ hours. Build quality is premium. Lid seal is perfect. Worth the price.", verified: true, reviewDate: new Date("2026-03-01") },
  { productId: "gid://shopify/Product/1004", productTitle: "Stainless Steel Water Bottle", author: "Megan H.", rating: 3, title: "Love the bottle, hate the box", body: "Why ship a heavy steel bottle in a thin cardboard box with no bubble wrap? Product is amazing when it arrives intact.", verified: false, reviewDate: new Date("2026-03-03") },

  // --- Bamboo Phone Case (mixed, some say flimsy) ---
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Tyler S.", rating: 2, title: "Feels flimsy and cheap", body: "The bamboo looks nice but offers zero protection. Dropped my phone from desk height and the case cracked. Not worth it.", verified: true, reviewDate: new Date("2026-02-13") },
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Nicole B.", rating: 4, title: "Beautiful eco-friendly case", body: "I bought this for the aesthetics and sustainability factor. It's lightweight and gorgeous. Just don't expect heavy duty protection.", verified: true, reviewDate: new Date("2026-02-18") },
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Greg L.", rating: 1, title: "Broke in 2 weeks", body: "Case cracked along the grain after just 2 weeks of normal use. No drops, just wore out from taking it on and off. Waste of money.", verified: true, reviewDate: new Date("2026-02-23") },
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Patricia N.", rating: 3, title: "Pretty but fragile", body: "The design is stunning and I love the bamboo texture. However it's not durable at all. More of a fashion accessory than phone protection.", verified: true, reviewDate: new Date("2026-02-27") },
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Alex J.", rating: 5, title: "Love the natural look", body: "If you want a stylish, eco-friendly case and you're careful with your phone, this is perfect. I've had mine 3 months with no issues.", verified: true, reviewDate: new Date("2026-03-02") },
  { productId: "gid://shopify/Product/1005", productTitle: "Bamboo Phone Case", author: "Michelle D.", rating: 2, title: "Not protective enough", body: "Looks cool but I expected more protection for the price. Corners started chipping after a month. Go with silicone if you need real protection.", verified: false, reviewDate: new Date("2026-03-04") },

  // --- LED Desk Lamp (positive, some say too bright) ---
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Steven W.", rating: 5, title: "Perfect for home office", body: "This lamp transformed my workspace. Three brightness levels, warm to cool color temps, and a sleek design. Highly recommend.", verified: true, reviewDate: new Date("2026-02-14") },
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Diana C.", rating: 4, title: "Great lamp but lowest setting too bright", body: "Love the design and build quality. My only issue is even the lowest brightness setting is quite bright for nighttime use. Needs a dimmer option.", verified: true, reviewDate: new Date("2026-02-19") },
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Robert E.", rating: 5, title: "Excellent build quality", body: "Sturdy base, flexible neck, USB charging port on the base. This thing has everything. Best desk lamp I've purchased.", verified: true, reviewDate: new Date("2026-02-24") },
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Kathy M.", rating: 3, title: "Too bright even on low", body: "The lamp itself is well made and looks great. But the lowest setting is still too harsh for evening reading. I need something softer.", verified: true, reviewDate: new Date("2026-02-28") },
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Vincent P.", rating: 5, title: "USB port is a game changer", body: "Finally a desk lamp with a built-in USB port! Charges my phone while I work. Light quality is excellent for detailed tasks.", verified: true, reviewDate: new Date("2026-03-02") },
  { productId: "gid://shopify/Product/1006", productTitle: "LED Desk Lamp", author: "Samantha G.", rating: 4, title: "Sleek and functional", body: "Modern design fits my minimalist desk setup perfectly. Works great during the day. Just wish the lowest setting was a bit dimmer for late nights.", verified: true, reviewDate: new Date("2026-03-04") },
];

export async function seedReviews(shop: string): Promise<number> {
  let count = 0;
  for (const review of SEED_REVIEWS) {
    await prisma.review.create({
      data: {
        shop,
        productId: review.productId,
        productTitle: review.productTitle,
        source: "seed",
        author: review.author,
        rating: review.rating,
        title: review.title,
        body: review.body,
        verified: review.verified,
        reviewDate: review.reviewDate,
      },
    });
    count++;
  }
  return count;
}

export async function clearReviews(shop: string): Promise<number> {
  const result = await prisma.review.deleteMany({ where: { shop } });
  return result.count;
}
