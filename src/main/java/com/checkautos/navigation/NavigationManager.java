package com.checkautos.navigation;

import java.util.HashMap;
import java.util.Map;

@org.springframework.stereotype.Service
public class NavigationManager {
    private String currentView;
    private int maxStep;

    private static final Map<String, Integer> VIEW_STEPS = new HashMap<>();

    static {
        VIEW_STEPS.put("dashboard", 1);
        VIEW_STEPS.put("autos", 1);
        VIEW_STEPS.put("registro", 1);
        VIEW_STEPS.put("revision", 2);
        VIEW_STEPS.put("mecanica", 3);
        VIEW_STEPS.put("valuacion", 4);
    }

    private static final Map<String, String> PAGE_TITLES = new HashMap<>();

    static {
        PAGE_TITLES.put("dashboard", "Dashboard");
        PAGE_TITLES.put("autos", "Autos registrados");
        PAGE_TITLES.put("registro", "Registrar auto");
        PAGE_TITLES.put("revision", "Revisión técnica");
        PAGE_TITLES.put("mecanica", "Revisión mecánica");
        PAGE_TITLES.put("valuacion", "Valuación / Precio");
    }

    public NavigationManager() {
        this.currentView = "dashboard";
        this.maxStep = 1;
    }


    public boolean switchView(String viewId) {
        Integer requiredStep = VIEW_STEPS.get(viewId);

        if (requiredStep == null) {
            return false;
        }

        if (requiredStep > maxStep) {
            return false;
        }

        this.currentView = viewId;
        return true;
    }


    public String getCurrentView() {
        return currentView;
    }


    public String getViewTitle(String viewId) {
        return PAGE_TITLES.getOrDefault(viewId, viewId);
    }


    public int getRequiredStep(String viewId) {
        return VIEW_STEPS.getOrDefault(viewId, 1);
    }


    public int getMaxStep() {
        return maxStep;
    }


    public void advanceToStep(int newMaxStep) {
        if (newMaxStep > this.maxStep) {
            this.maxStep = newMaxStep;
        }
    }


    public boolean isViewLocked(String viewId) {
        Integer requiredStep = VIEW_STEPS.get(viewId);
        return requiredStep != null && requiredStep > maxStep;
    }


    public String getCurrentStepTitle() {
        return getViewTitle(currentView);
    }


    public void reset() {
        this.currentView = "dashboard";
        this.maxStep = 1;
    }


    public String[] getAllViews() {
        return VIEW_STEPS.keySet().toArray(new String[0]);
    }


    public void advanceToNextStep() {
        switch (currentView) {
            case "registro":
                advanceToStep(2);
                switchView("revision");
                break;
            case "revision":
                advanceToStep(3);
                switchView("mecanica");
                break;
            case "mecanica":
                advanceToStep(4);
                switchView("valuacion");
                break;
            case "valuacion":
                reset();
                switchView("dashboard");
                break;
        }
    }
}