import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const galleryImages = [
  { id: 1, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 1", hint: "pokemon card version" },
  { id: 2, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 2", hint: "pokemon card artwork" },
  { id: 3, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 3", hint: "pokemon card holo" },
  { id: 4, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 4", hint: "pokemon card fullart" },
  { id: 5, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 5", hint: "pokemon card secret" },
  { id: 6, src: "https://placehold.co/200x280.png", alt: "Pokemon Card Edition 6", hint: "pokemon card shiny" },
];

export function ImageGallery() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {galleryImages.map((image) => (
            <div key={image.id} className="rounded-lg overflow-hidden shadow-md aspect-[2.5/3.5] hover:scale-105 transition-transform duration-300">
              <Image
                src={image.src}
                alt={image.alt}
                width={200}
                height={280}
                className="object-cover w-full h-full"
                data-ai-hint={image.hint}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
