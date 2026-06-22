package de.heim.apps.service;

import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordService {

    private static final int COST = 12;

    public String hash(String plaintext) {
        return BCrypt.withDefaults().hashToString(COST, plaintext.toCharArray());
    }

    public boolean verify(String plaintext, String hash) {
        if (hash == null) return false;
        return BCrypt.verifyer().verify(plaintext.toCharArray(), hash).verified;
    }
}
