package com.checkautos.cars;

import com.checkautos.models.Car;
import java.time.LocalDate;

@org.springframework.stereotype.Service
public class ValuationManager {
    private static final int MAX_SCORE = 100;
    private static final int SCORE_GOOD = 10;
    private static final int SCORE_REGULAR = 5;
    private static final int SCORE_BAD = 0;


    public int calculateTechnicalScore(int goodCount, int regularCount, int badCount) {
        int totalItems = goodCount + regularCount + badCount;
        if (totalItems == 0) return 0;

        int totalScore = (goodCount * SCORE_GOOD) + (regularCount * SCORE_REGULAR) + (badCount * SCORE_BAD);
        return Math.round((totalScore * MAX_SCORE) / (totalItems * SCORE_GOOD));
    }


    public int calculateMechanicalScore(int goodCount, int regularCount, int badCount) {
        return calculateTechnicalScore(goodCount, regularCount, badCount);
    }


    public int calculateCombinedScore(int technicalScore, int mechanicalScore) {
        return (technicalScore + mechanicalScore) / 2;
    }


    public int getDiscountPercentage(int combinedScore) {
        if (combinedScore >= 95) return 0;
        if (combinedScore >= 85) return 5;
        if (combinedScore >= 75) return 12;
        if (combinedScore >= 65) return 20;
        if (combinedScore >= 55) return 30;
        if (combinedScore >= 45) return 42;
        if (combinedScore >= 35) return 55;
        return 65;
    }


    public int calculateBasePrice(String yearString) {
        try {
            int year = Integer.parseInt(yearString);
            int currentYear = LocalDate.now().getYear();
            int age = currentYear - year;

            int minPrice = 20_000_000;
            int basePrice = 90_000_000 - (age * 5_500_000);
            return Math.max(minPrice, basePrice);
        } catch (NumberFormatException e) {
            return 20_000_000;
        }
    }


    public int calculateFinalPrice(int basePrice, int discountPercentage) {
        int discountAmount = Math.round(basePrice * discountPercentage / 100);
        return basePrice - discountAmount;
    }


    public int valuateCar(Car car) {
        int basePrice = calculateBasePrice(car.getAño());
        int combinedScore = calculateCombinedScore(car.getPuntajeTecnico(), car.getPuntajeMecanico());
        int discount = getDiscountPercentage(combinedScore);
        int finalPrice = calculateFinalPrice(basePrice, discount);

        car.setPrecio(finalPrice);
        return finalPrice;
    }


    public String getScoreDescription(int score) {
        if (score >= 85) return "Excelente";
        if (score >= 75) return "Muy Bueno";
        if (score >= 65) return "Bueno";
        if (score >= 50) return "Regular";
        return "Deficiente";
    }


    public boolean isFullyRated(Car car) {
        return car.getPuntajeTecnico() > 0 && car.getPuntajeMecanico() > 0;
    }
}