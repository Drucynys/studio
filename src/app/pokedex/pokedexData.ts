
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
  { name: "Galar", generation: 8, pokemonCount: 96 }, // Reflects main Galar dex + IoA/CT additions often grouped
  { name: "Paldea", generation: 9, pokemonCount: 120 }, // Updated count for Paldea based on 1025 max ID
];

const getRegionForId = (id: number): string => {
  if (id <= 151) return "Kanto";
  if (id <= 251) return "Johto";
  if (id <= 386) return "Hoenn";
  if (id <= 493) return "Sinnoh";
  if (id <= 649) return "Unova";
  if (id <= 721) return "Kalos";
  if (id <= 809) return "Alola";
  if (id <= 905) return "Galar"; 
  if (id <= 1025) return "Paldea"; 
  return "Unknown";
};

const createPokemonEntry = (id: number, name: string): PokemonPokedexEntry => ({
  id,
  name,
  region: getRegionForId(id),
  spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
});

const knownPokemonNames: { [id: number]: string } = {
  1: "Bulbasaur", 2: "Ivysaur", 3: "Venusaur", 4: "Charmander", 5: "Charmeleon", 6: "Charizard", 7: "Squirtle", 8: "Wartortle", 9: "Blastoise", 10: "Caterpie", 11: "Metapod", 12: "Butterfree", 13: "Weedle", 14: "Kakuna", 15: "Beedrill", 16: "Pidgey", 17: "Pidgeotto", 18: "Pidgeot", 19: "Rattata", 20: "Raticate", 21: "Spearow", 22: "Fearow", 23: "Ekans", 24: "Arbok", 25: "Pikachu", 26: "Raichu", 27: "Sandshrew", 28: "Sandslash", 29: "Nidoran♀", 30: "Nidorina", 31: "Nidoqueen", 32: "Nidoran♂", 33: "Nidorino", 34: "Nidoking", 35: "Clefairy", 36: "Clefable", 37: "Vulpix", 38: "Ninetales", 39: "Jigglypuff", 40: "Wigglytuff", 50: "Diglett", 51: "Dugtrio", 52: "Meowth", 53: "Persian", 54: "Psyduck", 55: "Golduck", 56: "Mankey", 57: "Primeape", 58: "Growlithe", 59:  "Arcanine",  60:  _x001C_Poliwag_x001D_,  61:  _x001C_Poliwhirl_x001D_,  62:  _x001C_Poliwrath_x001D_,  63:  _x001C_Abra_x001D_,  64:  _x001C_Kadabra_x001D_,  65:  _x001C_Alakazam_x001D_,  66:  _x001C_Machop_x001D_,  67:  _x001C_Machoke_x001D_,  68:  _x001C_Machamp_x001D_,  74:  _x001C_Geodude_x001D_,  75:  _x001C_Graveler_x001D_,  76:  _x001C_Golem_x001D_,  77:  _x001C_Ponyta_x001D_,  78:  _x001C_Rapidash_x001D_,  92:  _x001C_Gastly_x001D_,  93:  _x001C_Haunter_x001D_,  94:  _x001C_Gengar_x001D_,  129: _x001C_Magikarp_x001D_, 130: _x001C_Gyarados_x001D_, 133: _x001C_Eevee_x001D_, 134: _x001C_Vaporeon_x001D_, 135: _x001C_Jolteon_x001D_, 136: _x001C_Flareon_x001D_, 143: _x001C_Snorlax_x001D_, 147: _x001C_Dratini_x001D_, 148: _x001C_Dragonair_x001D_, 149: _x001C_Dragonite_x001D_, 150: "Mewtwo", 151: "Mew",
  152: "Chikorita", 153: "Bayleef", 154: "Meganium", 155: "Cyndaquil", 156: "Quilava", 157: "Typhlosion", 158: "Totodile", 159: "Croconaw", 160: "Feraligatr", 172: "Pichu", 175: "Togepi", 176: "Togetic", 196: "Espeon", 197: "Umbreon", 243: "Raikou", 244: "Entei", 245: "Suicune", 249: "Lugia", 250: "Ho-Oh", 251: "Celebi",
  252: "Treecko", 253: "Grovyle", 254: "Sceptile", 255: "Torchic", 256: "Combusken", 257: "Blaziken", 258: "Mudkip", 259: "Marshtomp", 260: "Swampert", 280: "Ralts", 281: "Kirlia", 282: "Gardevoir", 382: "Kyogre", 383: "Groudon", 384: "Rayquaza",
  387: "Turtwig", 388: "Grotle", 389: "Torterra", 390: "Chimchar", 391: "Monferno", 392: "Infernape", 393: "Piplup", 394: "Prinplup", 395: "Empoleon", 447: "Riolu", 448: "Lucario", 483: "Dialga", 484: "Palkia", 493: "Arceus",
  495: "Snivy", 498: "Tepig", 501: "Oshawott",
  650: "Chespin", 653: "Fennekin", 656: "Froakie",
  722: "Rowlet", 725: "Litten", 728: "Popplio",
  810: "Grookey", 813: "Scorbunny", 816: "Sobble",
  906: "Sprigatito", 909: "Fuecoco", 912: "Quaxly",
};

const generatedPokemonData: PokemonPokedexEntry[] = [];
for (let id = 1; id <= 1025; id++) {
  const name = knownPokemonNames[id] || `Pokémon #${id}`;
  generatedPokemonData.push(createPokemonEntry(id, name));
}

export const allPokemonData: PokemonPokedexEntry[] = generatedPokemonData;

