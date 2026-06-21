package de.heim.apps.service;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class ScoreboardEvents {

    private final ConcurrentHashMap<String, BroadcastProcessor<String>> processors = new ConcurrentHashMap<>();

    public Multi<String> stream(String compId) {
        return processors.computeIfAbsent(compId, k -> BroadcastProcessor.create());
    }

    public void emit(String compId) {
        BroadcastProcessor<String> p = processors.get(compId);
        if (p != null) p.onNext("update");
    }
}
