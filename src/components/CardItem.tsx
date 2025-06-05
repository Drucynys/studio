
import type { PokemonCard } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Coins, Sparkles, ShieldCheck, ExternalLink } from "lucide-react";

type CardItemProps = {
  card: PokemonCard;
};

export function CardItem({ card }: CardItemProps) {
  const tcgPlayerSearchUrl = `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name || '')}&view=grid`;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 animate-card-appear flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          {card.name || `${card.set} #${card.cardNumber}`}
        </CardTitle>
        {card.name && <CardDescription>{card.set} #{card.cardNumber}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        {card.imageUrl ? (
            <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2">
                 <Image src={card.imageUrl} alt={card.name || card.cardNumber} width={250} height={350} className="object-contain w-full h-full" data-ai-hint="pokemon card front"/>
            </div>
        ) : (
            <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 bg-muted flex items-center justify-center" data-ai-hint="pokemon card blank">
                 <Sparkles className="h-16 w-16 text-muted-foreground opacity-50" />
            </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <strong>Rarity:</strong> <Badge variant="secondary">{card.rarity}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-green-500" /> 
          <strong>Condition:</strong> <Badge variant="outline">{card.condition}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 pt-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Coins className="h-5 w-5" />
          Value: ${card.value.toFixed(2)}
        </div>
        {card.name && (
           <a
            href={tcgPlayerSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
          >
            View on TCGPlayer <ExternalLink size={12} />
          </a>
        )}
      </CardFooter>
    </Card>
  );
}
