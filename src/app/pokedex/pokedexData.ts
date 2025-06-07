
export interface PokedexRegion {
  name: string;
  generation: number;
  pokemonCount?: number; // Optional: for displaying total Pokemon in that region
}

export interface PokemonPokedexEntry {
  id: number; // National Pokedex number
  name: string;
  region: string;
  spriteUrl: string; 
}

export const pokedexRegions: PokedexRegion[] = [
  { name: "Kanto", generation: 1, pokemonCount: 151 },
  { name: "Johto", generation: 2, pokemonCount: 100 },
  { name: "Hoenn", generation: 3, pokemonCount: 135 },
  { name: "Sinnoh", generation: 4, pokemonCount: 107 },
  { name: "Unova", generation: 5, pokemonCount: 156 },
  { name: "Kalos", generation: 6, pokemonCount: 72 },
  { name: "Alola", generation: 7, pokemonCount: 88 },
  { name: "Galar", generation: 8, pokemonCount: 96 },
  { name: "Paldea", generation: 9, pokemonCount: 100 }, // Example count, adjust as needed
];

export const allPokemonData: PokemonPokedexEntry[] = [
  // Kanto
  { id: 1, name: "Bulbasaur", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png` },
  { id: 2, name: "Ivysaur", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png` },
  { id: 3, name: "Venusaur", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png` },
  { id: 4, name: "Charmander", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png` },
  { id: 5, name: "Charmeleon", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png` },
  { id: 6, name: "Charizard", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png` },
  { id: 7, name: "Squirtle", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png` },
  { id: 8, name: "Wartortle", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png` },
  { id: 9, name: "Blastoise", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png` },
  { id: 25, name: "Pikachu", region: "Kanto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png` },
  
  // Johto
  { id: 152, name: "Chikorita", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/152.png` },
  { id: 153, name: "Bayleef", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/153.png` },
  { id: 154, name: "Meganium", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/154.png` },
  { id: 155, name: "Cyndaquil", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/155.png` },
  { id: 156, name: "Quilava", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/156.png` },
  { id: 157, name: "Typhlosion", region: "Johto", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/157.png` },
  
  // Hoenn
  { id: 252, name: "Treecko", region: "Hoenn", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/252.png` },
  { id: 255, name: "Torchic", region: "Hoenn", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/255.png` },
  { id: 258, name: "Mudkip", region: "Hoenn", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/258.png` },

  // Sinnoh
  { id: 387, name: "Turtwig", region: "Sinnoh", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/387.png`},
  { id: 390, name: "Chimchar", region: "Sinnoh", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/390.png`},
  { id: 393, name: "Piplup", region: "Sinnoh", spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/393.png`},
];
