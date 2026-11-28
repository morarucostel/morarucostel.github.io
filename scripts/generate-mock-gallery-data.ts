import { write } from "bun";

const CATEGORIES = [
  "galaxies",
  "cosmic-clouds",
  "star-clusters", 
  "stellar-echoes",
  "solar-system",
  "equipment"
];

const TITLES: Record<string, string[]> = {
  "galaxies": ["Silent Gaze", "Urban Soul", "Fading Light", "The Artist", "Tokyo Drifter", "Morning Coffee", "Shadow Play", "Neon Dreams", "Solitude", "The Wait"],
  "cosmic-clouds": ["Misty Valley", "Mountain Peak", "Ocean Whisper", "Desert Winds", "Forest Deep", "Winter Silence", "Autumn Gold", "River Flow", "Storm Rising", "Sunset Hues"],
  "star-clusters": ["Crossing Shibuya", "Rainy Night", "Subway Life", "Market Chaos", "Lonely Walker", "City Reflection", "Neon Alley", "Bus Stop", "Traffic Blur", "Vendor's Smile"],
  "stellar-echoes": ["The Vows", "Jazz Night", "First Dance", "Concert Crowd", "Festival Lights", "Backstage", "Cheers", "The Speech", "Confetti Fall", "Last Song"],
  "solar-system": ["Vogue September", "Kinfolk Feature", "Fashion Week", "Studio Session", "Texture Study", "Monochrome Mood", "Red Dress", "Vintage Vibes", "Modern Muse", "Accessory Detail"],
  "equipment": ["Steel Curves", "Glass Tower", "Concrete Jungle", "Spiral Stair", "Geometric Shadow", "Bridge Lines", "Old Facade", "Sky Reflection", "Minimal Wall", "Urban Canyon"]
};

const images = [];

for (const category of CATEGORIES) {
  for (let i = 1; i <= 10; i++) {
    const title = TITLES[category][i-1] || `${category} ${i}`;
    images.push({
      id: `${category}-${i}`,
      src: `/images/gallery/${category}/${category}-${i}.jpg`, // Adjusted to match optimized output structure likely used in frontend
      category: category,
      title: title,
      caption: `A captured moment from the ${category} series.`,
      featured: i <= 2, // First 2 are featured
      exif: {
        camera: "Sony A7RV",
        lens: "35mm f/1.4 GM",
        iso: 100 + (i * 10),
        aperture: "f/1.4",
        shutter: "1/250s"
      }
    });
  }
}

await write("src/data/gallery-images.json", JSON.stringify(images, null, 2));
console.log("Mock gallery data generated.");
