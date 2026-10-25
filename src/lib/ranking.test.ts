import { describe, it, expect } from "vitest";
import { bayesianScore, rankPlaces } from "./ranking";

describe("bayesianScore", () => {
    it("returns the mean when there are no reviews", () => {
        expect(bayesianScore(5, 0, 25, 4.2)).toBeCloseTo(4.2);
    });

    it("returns the place's own rating when reviews far exceed the threshold", () => {
        expect(bayesianScore(4.7, 100_000, 25, 4.2)).toBeCloseTo(4.7, 2);
    });

    it("weights equal reviews and threshold halfway between R and C", () => {
        // v = m, so the weights are both 0.5
        expect(bayesianScore(5, 25, 25, 3)).toBeCloseTo(4);
    });
});

describe("rankPlaces", () => {
    it("ranks a well-reviewed 4.7 above a 5.0 with only 2 reviews", () => {
        const places = [
            { id: "new-favourite", rating: 5.0, userRatingCount: 2 },
            { id: "established", rating: 4.7, userRatingCount: 2000 },
            { id: "middle", rating: 4.3, userRatingCount: 150 },
        ];

        const ranked = rankPlaces(places);

        expect(ranked.map((r) => r.place.id)).toEqual([
            "established",
            "new-favourite",
            "middle",
        ]);
    });

    it("puts places without ratings at the bottom", () => {
        const places = [
            { id: "unrated", rating: null, userRatingCount: null },
            { id: "rated", rating: 4.0, userRatingCount: 100 },
        ];

        const ranked = rankPlaces(places);

        expect(ranked[0].place.id).toBe("rated");
        expect(ranked[1].weightedRating).toBe(0);
    });

    it("returns an empty array for empty input", () => {
        expect(rankPlaces([])).toEqual([]);
    });

    it("does not mutate the input array", () => {
        const places = [
            { id: "a", rating: 3.0, userRatingCount: 50 },
            { id: "b", rating: 4.5, userRatingCount: 500 },
        ];
        const original = [...places];

        rankPlaces(places);

        expect(places).toEqual(original);
    });
});