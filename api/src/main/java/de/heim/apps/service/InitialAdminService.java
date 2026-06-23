package de.heim.apps.service;

import de.heim.apps.entity.User;
import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class InitialAdminService {

    @Inject
    PasswordService passwordService;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        if (User.count() > 0) return;

        User admin = new User();
        admin.email = "admin@betabattle.local";
        admin.passwordHash = passwordService.hash("admin");
        admin.displayName = "Admin";
        admin.role = "ADMIN";
        admin.emailVerified = true;
        admin.persist();

        Log.info("Initial admin user created: admin@betabattle.local / admin");
    }
}
