import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  ArrowRight,
  Star,
  MapPin,
  Calendar,
  Leaf,
  Award,
  Users,
} from "lucide-react";
import exampleImage from "figma:asset/53197a9722055b4df5868eadff9c411e4e6b3489.png";

interface StrainData {
  name: string;
  altNames: string[];
  nicknames: string[];
  hybridization: string;
  flavors: string[];
  effects: string[];
  physicalCharacteristics: {
    color: string;
    budStructure: string;
    trichomes: string;
  };
  releaseDate: string;
  lineage: string;
  trivia: string;
  awards: string[];
  similarStrains: string[];
  availability: string[];
  rating: {
    score: number;
    reviews: number;
    commonComments: string[];
  };
}

export function ChatBot() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [strainData, setStrainData] =
    useState<StrainData | null>(null);

  const mockStrainData: StrainData = {
    name: "Blue Dream",
    altNames: ["Blueberry Dream", "Azure Haze"],
    nicknames: ["BD", "The Dream"],
    hybridization:
      "Sativa-dominant Hybrid (60% Sativa, 40% Indica)",
    flavors: ["Sweet Berry", "Vanilla", "Herbal"],
    effects: ["Euphoric", "Creative", "Relaxed"],
    physicalCharacteristics: {
      color: "Deep green with blue undertones",
      budStructure: "Dense, medium-sized nugs",
      trichomes: "Abundant crystal coating",
    },
    releaseDate: "2003",
    lineage: "Blueberry × Super Silver Haze",
    trivia:
      "One of the most popular strains in California dispensaries",
    awards: [
      "Cannabis Cup Winner 2003",
      "Strain of the Year 2012",
    ],
    similarStrains: [
      "Green Crack",
      "Sour Diesel",
      "Pineapple Express",
    ],
    availability: [
      "California",
      "Colorado",
      "Washington",
      "Oregon",
      "Nevada",
    ],
    rating: {
      score: 4.6,
      reviews: 2847,
      commonComments: [
        "Perfect balance",
        "Great for daytime",
        "Smooth smoke",
      ],
    },
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setInputValue("");
    setIsLoading(true);

    // Simulate processing and go directly to dashboard
    setTimeout(() => {
      setStrainData(mockStrainData);
      setShowDashboard(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBackToChat = () => {
    setShowDashboard(false);
    setStrainData(null);
    setInputValue("");
  };

  if (showDashboard && strainData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between py-6 px-8 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src={exampleImage}
                alt="Strain Search Icon"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-medium text-foreground">
              strain.search
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={handleBackToChat}
            className="text-base px-6"
          >
            New Search
          </Button>
        </div>

        {/* Dashboard Grid */}
        <div className="container mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Name Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Leaf className="w-6 h-6 text-green-600" />
                  Name
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-3xl font-semibold text-foreground mb-2">
                    {strainData.name}
                  </h3>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Alternative Names
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.altNames.map((name, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Nicknames
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.nicknames.map(
                      (nickname, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm px-3 py-1"
                        >
                          {nickname}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attributes Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Star className="w-6 h-6 text-purple-600" />
                  Attributes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Hybridization
                  </h4>
                  <p className="text-lg">
                    {strainData.hybridization}
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Top Flavors
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.flavors.map((flavor, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {flavor}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Top Effects
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.effects.map((effect, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm px-3 py-1"
                      >
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Physical Characteristics
                  </h4>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">
                        Color:
                      </span>{" "}
                      {strainData.physicalCharacteristics.color}
                    </p>
                    <p>
                      <span className="font-medium">
                        Bud Structure:
                      </span>{" "}
                      {
                        strainData.physicalCharacteristics
                          .budStructure
                      }
                    </p>
                    <p>
                      <span className="font-medium">
                        Trichomes:
                      </span>{" "}
                      {
                        strainData.physicalCharacteristics
                          .trichomes
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Release Date
                  </h4>
                  <p className="text-lg">
                    {strainData.releaseDate}
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Lineage / Genetics
                  </h4>
                  <p className="text-lg">
                    {strainData.lineage}
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Trivia
                  </h4>
                  <p className="text-base leading-relaxed">
                    {strainData.trivia}
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Awards
                  </h4>
                  <div className="space-y-2">
                    {strainData.awards.map((award, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2"
                      >
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>{award}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Similar Strains
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.similarStrains.map(
                      (strain, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-sm px-3 py-1"
                        >
                          {strain}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Users className="w-6 h-6 text-orange-600" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Availability by State
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {strainData.availability.map(
                      (state, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1"
                        >
                          <MapPin className="w-4 h-4 text-green-600" />
                          <Badge
                            variant="outline"
                            className="text-sm px-3 py-1"
                          >
                            {state}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    User Rating
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-2xl font-semibold">
                          {strainData.rating.score}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        (
                        {strainData.rating.reviews.toLocaleString()}{" "}
                        reviews)
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-muted-foreground mb-3">
                    Common Comments
                  </h4>
                  <div className="space-y-2">
                    {strainData.rating.commonComments.map(
                      (comment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                          <span className="text-base">
                            "{comment}"
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - ChatGPT style
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background px-6">
      <div className="w-full max-w-2xl">
        {/* Header with icon and title */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 mb-8 flex items-center justify-center">
            <img
              src={exampleImage}
              alt="Strain Search Icon"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-medium text-foreground mb-16">
            Strain Search
          </h1>
        </div>

        {/* Input area */}
        <div className="relative">
          <div className="flex items-center gap-3 bg-muted rounded-3xl p-5 shadow-sm">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-lg text-white placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <div className="flex items-center shrink-0">
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="rounded-full h-11 w-11 bg-muted-foreground hover:bg-muted-foreground/80 text-background"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-lg">
              Searching strain database...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}