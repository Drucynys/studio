
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
  { name: "Paldea", generation: 9, pokemonCount: 100 }, // Placeholder count, adjust as more data comes
];

const getRegionForId = (id: number): string => {
  if (id <= 151) return "Kanto";
  if (id <= 251) return "Johto";
  if (id <= 386) return "Hoenn";
  if (id <= 493) return "Sinnoh";
  if (id <= 649) return "Unova";
  if (id <= 721) return "Kalos";
  if (id <= 809) return "Alola";
  if (id <= 905) return "Galar"; // Includes Isle of Armor and Crown Tundra often
  if (id <= 1025) return "Paldea"; // Current known max for Paldea sprites
  return "Unknown";
};

const createPokemonEntry = (id: number, name: string): PokemonPokedexEntry => ({
  id,
  name,
  region: getRegionForId(id),
  spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
});

export const allPokemonData: PokemonPokedexEntry[] = [
  // Kanto (Gen 1)
  createPokemonEntry(1, "Bulbasaur"),
  createPokemonEntry(2, "Ivysaur"),
  createPokemonEntry(3, "Venusaur"),
  createPokemonEntry(4, "Charmander"),
  createPokemonEntry(5, "Charmeleon"),
  createPokemonEntry(6, "Charizard"),
  createPokemonEntry(7, "Squirtle"),
  createPokemonEntry(8, "Wartortle"),
  createPokemonEntry(9, "Blastoise"),
  createPokemonEntry(10, "Caterpie"),
  createPokemonEntry(11, "Metapod"),
  createPokemonEntry(12, "Butterfree"),
  createPokemonEntry(13, "Weedle"),
  createPokemonEntry(14, "Kakuna"),
  createPokemonEntry(15, "Beedrill"),
  createPokemonEntry(16, "Pidgey"),
  createPokemonEntry(17, "Pidgeotto"),
  createPokemonEntry(18, "Pidgeot"),
  createPokemonEntry(19, "Rattata"),
  createPokemonEntry(20, "Raticate"),
  createPokemonEntry(21, "Spearow"),
  createPokemonEntry(22, "Fearow"),
  createPokemonEntry(23, "Ekans"),
  createPokemonEntry(24, "Arbok"),
  createPokemonEntry(25, "Pikachu"),
  createPokemonEntry(26, "Raichu"),
  createPokemonEntry(27, "Sandshrew"),
  createPokemonEntry(28, "Sandslash"),
  createPokemonEntry(29, "Nidoran♀"),
  createPokemonEntry(30, "Nidorina"),
  createPokemonEntry(31, "Nidoqueen"),
  createPokemonEntry(32, "Nidoran♂"),
  createPokemonEntry(33, "Nidorino"),
  createPokemonEntry(34, "Nidoking"),
  createPokemonEntry(35, "Clefairy"),
  createPokemonEntry(36, "Clefable"),
  createPokemonEntry(37, "Vulpix"),
  createPokemonEntry(38, "Ninetales"),
  createPokemonEntry(39, "Jigglypuff"),
  createPokemonEntry(40, "Wigglytuff"),
  createPokemonEntry(50, "Diglett"),
  createPokemonEntry(51, "Dugtrio"),
  createPokemonEntry(52, "Meowth"),
  createPokemonEntry(53, "Persian"),
  createPokemonEntry(54, "Psyduck"),
  createPokemonEntry(55, "Golduck"),
  createPokemonEntry(56, "Mankey"),
  createPokemonEntry(57, "Primeape"),
  createPokemonEntry(58, "Growlithe"),
  createPokemonEntry(59, "Arcanine"),
  createPokemonEntry(60, "Poliwag"),
  createPokemonEntry(61, "Poliwhirl"),
  createPokemonEntry(62, "Poliwrath"),
  createPokemonEntry(63, "Abra"),
  createPokemonEntry(64, "Kadabra"),
  createPokemonEntry(65, "Alakazam"),
  createPokemonEntry(66, "Machop"),
  createPokemonEntry(67, "Machoke"),
  createPokemonEntry(68, "Machamp"),
  createPokemonEntry(74, "Geodude"),
  createPokemonEntry(75, "Graveler"),
  createPokemonEntry(76, "Golem"),
  createPokemonEntry(77, "Ponyta"),
  createPokemonEntry(78, "Rapidash"),
  createPokemonEntry(92, "Gastly"),
  createPokemonEntry(93, "Haunter"),
  createPokemonEntry(94, "Gengar"),
  createPokemonEntry(129, "Magikarp"),
  createPokemonEntry(130, "Gyarados"),
  createPokemonEntry(133, "Eevee"),
  createPokemonEntry(134, "Vaporeon"),
  createPokemonEntry(135, "Jolteon"),
  createPokemonEntry(136, "Flareon"),
  createPokemonEntry(143, "Snorlax"),
  createPokemonEntry(147, "Dratini"),
  createPokemonEntry(148, "Dragonair"),
  createPokemonEntry(149, "Dragonite"),
  createPokemonEntry(150, "Mewtwo"),
  createPokemonEntry(151, "Mew"),

  // Johto (Gen 2)
  createPokemonEntry(152, "Chikorita"),
  createPokemonEntry(153, "Bayleef"),
  createPokemonEntry(154, "Meganium"),
  createPokemonEntry(155, "Cyndaquil"),
  createPokemonEntry(156, "Quilava"),
  createPokemonEntry(157, "Typhlosion"),
  createPokemonEntry(158, "Totodile"),
  createPokemonEntry(159, "Croconaw"),
  createPokemonEntry(160, "Feraligatr"),
  createPokemonEntry(172, "Pichu"),
  createPokemonEntry(175, "Togepi"),
  createPokemonEntry(176, "Togetic"),
  createPokemonEntry(196, "Espeon"),
  createPokemonEntry(197, "Umbreon"),
  createPokemonEntry(243, "Raikou"),
  createPokemonEntry(244, "Entei"),
  createPokemonEntry(245, "Suicune"),
  createPokemonEntry(249, "Lugia"),
  createPokemonEntry(250, "Ho-Oh"),
  createPokemonEntry(251, "Celebi"),
  
  // Hoenn (Gen 3)
  createPokemonEntry(252, "Treecko"),
  createPokemonEntry(253, "Grovyle"),
  createPokemonEntry(254, "Sceptile"),
  createPokemonEntry(255, "Torchic"),
  createPokemonEntry(256, "Combusken"),
  createPokemonEntry(257, "Blaziken"),
  createPokemonEntry(258, "Mudkip"),
  createPokemonEntry(259, "Marshtomp"),
  createPokemonEntry(260, "Swampert"),
  createPokemonEntry(280, "Ralts"),
  createPokemonEntry(281, "Kirlia"),
  createPokemonEntry(282, "Gardevoir"),
  createPokemonEntry(382, "Kyogre"),
  createPokemonEntry(383, "Groudon"),
  createPokemonEntry(384, "Rayquaza"),

  // Sinnoh (Gen 4)
  createPokemonEntry(387, "Turtwig"),
  createPokemonEntry(388, "Grotle"),
  createPokemonEntry(389, "Torterra"),
  createPokemonEntry(390, "Chimchar"),
  createPokemonEntry(391, "Monferno"),
  createPokemonEntry(392, "Infernape"),
  createPokemonEntry(393, "Piplup"),
  createPokemonEntry(394, "Prinplup"),
  createPokemonEntry(395, "Empoleon"),
  createPokemonEntry(447, "Riolu"),
  createPokemonEntry(448, "Lucario"),
  createPokemonEntry(483, "Dialga"),
  createPokemonEntry(484, "Palkia"),
  createPokemonEntry(493, "Arceus"),

  // Unova (Gen 5) - Starters
  createPokemonEntry(495, "Snivy"),
  createPokemonEntry(498, "Tepig"),
  createPokemonEntry(501, "Oshawott"),

  // Kalos (Gen 6) - Starters
  createPokemonEntry(650, "Chespin"),
  createPokemonEntry(653, "Fennekin"),
  createPokemonEntry(656, "Froakie"),

  // Alola (Gen 7) - Starters
  createPokemonEntry(722, "Rowlet"),
  createPokemonEntry(725, "Litten"),
  createPokemonEntry(728, "Popplio"),

  // Galar (Gen 8) - Starters
  createPokemonEntry(810, "Grookey"),
  createPokemonEntry(813, "Scorbunny"),
  createPokemonEntry(816, "Sobble"),

  // Paldea (Gen 9) - Starters
  createPokemonEntry(906, "Sprigatito"),
  createPokemonEntry(909, "Fuecoco"),
  createPokemonEntry(912, "Quaxly"),
];
