---
title: "Typische Parameter und Claims-Referenz"
---

# Typische Parameter und Claims-Referenz

Diese Seite ist eine Schnelleinsichtstabelle; Flow-Kontext siehe [Typische Flows](./flows.md), Konzepterklärung siehe [Kernkonzepte](./concepts.md).

## Authentifizierungsanfrageparameter

Parameter zum authorization endpoint (OIDC-Perspektive, mit OAuth2-Grundparametern):

| Parameter | Erforderlich | Erklärung |
|------|--------|------|
| `scope` | Erforderlich | Leerzeichen getrennt; **muss `openid` enthalten**, sonst ist es nur eine normale OAuth2-Anfrage und gibt kein ID Token zurück |
| `response_type` | Erforderlich | Bestimmt flow: `code` (empfohlen) / `id_token` / `code id_token` usw. |
| `client_id` | Erforderlich | Client-Kennung, die RP bei OP-Registrierung erhalten hat |
| `redirect_uri` | Erforderlich | Callback-Adresse, muss genau mit registriertem Wert übereinstimmen (kein Wildcard erlaubt) |
| `state` | Stark empfohlen | Opaque zufällig Wert, beim Callback unverändert zurückgegeben; RP validiert zur CSRF-Verhütung, kann auch Zustände wie Rücksprung-Pfade tragen |
| `nonce` | code flow empfohlen, implicit/hybrid erforderlich | Zufallswert, OP schreibt ihn unverändert in ID-Token `nonce` Claim; RP validiert zur Replay-Verhütung |
| `prompt` | Optional | Steuert OP-Interaktionsverhalten, siehe unten [prompt-Wert-Tabelle](#prompt-wert-tabelle) |
| `max_age` | Optional | Maximale Authentifizierungs-Gültigkeitssekunden; wenn letzter Benutzer-Auth länger her ist, muss OP erneut authentifizieren und `auth_time` im ID Token zurückgeben |
| `login_hint` | Optional | Hinweis auf Anmelde-Kennung (z. B. E-Mail), OP kann Login-Fenster vorausfüllen; häufig in "Benutzer ist bekannt"-Szenarien |
| `acr_values` | Optional | Erwartete Authentifizierungskontextklasse-Level (leerzeichen-getrennt, nach Priorität), z. B. MFA erfordern; Ergebnis wird im ID-Token `acr` widergespiegelt |
| `display` | Optional | Erwartete Anzeigeweise: `page` / `popup` / `touch` / `wap` |
| `ui_locales` | Optional | Erwartete UI-Sprache, z. B. `zh-CN zh en` |
| `code_challenge` / `code_challenge_method` | Öffentliche Clients erforderlich | PKCE-Parameter, `method` sollte `S256` sein |

## ID-Token-Claims

### Erforderliche Claims

| Claim | Typ | Erklärung |
|-------|------|------|
| `iss` | string (URL) | Aussteller, muss OP-issuer entsprechen |
| `sub` | string (≤255 ASCII) | Eindeutige Benutzer-Kennung, stabil und nicht wiederverwendet innerhalb eines OP; lokaler Primärschlüssel sollte `iss + sub` sein |
| `aud` | string oder array | Zielgruppe, muss RP-`client_id` enthalten |
| `exp` | number | Ablaufzeit (Unix-Sekunden) |
| `iat` | number | Ausstellungszeit (Unix-Sekunden) |

### Bedingt erforderlich / optionale Claims

| Claim | Wann erscheint | Erklärung |
|-------|----------|------|
| `nonce` | Wenn Anfrage `nonce` enthält, erforderlich | Nonce von Anfrage unverändert zurückgegeben, RP muss abgleichen |
| `auth_time` | Mit `max_age` erforderlich, sonst optional | Tatsächliche Benutzer-Authentifizierungszeit |
| `acr` | Optional | Erreichte Authentifizierungskontextklasse-Level |
| `amr` | Optional | Authentifizierungsmethoden-Array, z. B. `["pwd","otp"]`, `["mfa"]` |
| `azp` | Mit mehrwertiger `aud` erforderlich | Tatsächliche `client_id` der Authorized Party |
| `at_hash` | Bei implicit/hybrid mit gleichzeitigem access_token erforderlich | Linke Hälfte der access-token-Hash, zur Token-Substitution-Verhütung |
| `c_hash` | Bei hybrid mit Code erforderlich | Linke Hälfte der Authentifizierungscode-Hash |
| `sid` | Optional | OP-Sitzungs-ID, Back-Channel Logout nach ihr zu lokalisieren |

## Standard-Claims-Übersicht (nach Scope gruppiert)

Diese Claims erscheinen in UserInfo-Antwort oder ID Token:

### scope=profile

| Claim | Typ | Erklärung |
|-------|------|------|
| `name` | string | Vollständiger Name (Anzeige) |
| `given_name` | string | Vorname |
| `family_name` | string | Nachname |
| `middle_name` | string | Mittlerer Name |
| `nickname` | string | Spitzname |
| `preferred_username` | string | Bevorzugter Benutzername; **kann sich ändern und kann dupliziert werden, nicht als Primärschlüssel geeignet** |
| `picture` | string (URL) | Avatar-Adresse |
| `profile` | string (URL) | Persönliche Startseite |
| `website` | string (URL) | Persönliche Website |
| `gender` | string | Geschlecht |
| `birthdate` | string | Geburtstag, `YYYY-MM-DD` oder `YYYY` (`0000` bedeutet nur Monat/Tag) |
| `zoneinfo` | string | Zeitzone, z. B. `Asia/Shanghai` |
| `locale` | string | Region, z. B. `zh-CN` |
| `updated_at` | number | Letzte Profil-Aktualisierungszeit (Unix-Sekunden) |

### scope=email

| Claim | Typ | Erklärung |
|-------|------|------|
| `email` | string | E-Mail |
| `email_verified` | boolean | Ist E-Mail von OP validiert; **muss wahr sein, bevor Email-Matching-Geschäftslogik läuft** |

### scope=phone

| Claim | Typ | Erklärung |
|-------|------|------|
| `phone_number` | string | Telefonnummer, vorzugsweise E.164-Format, z. B. `+8613800138000` |
| `phone_number_verified` | boolean | Ist validiert |

### scope=address

| Claim | Typ | Erklärung |
|-------|------|------|
| `address` | JSON-Objekt | Mit `formatted`, `street_address`, `locality`, `region`, `postal_code`, `country` Unterfeldern |

## Discovery-Dokument-Schlüsselfelder

`/.well-known/openid-configuration` häufig verwendete Felder bei RP:

| Feld | Erklärung |
|------|------|
| `issuer` | OP-Kennung, muss mit issuer vom Anfrage-URL genau übereinstimmen, auch erwarteter Wert von ID-Token `iss` |
| `authorization_endpoint` | Authentifizierungs-/Autorisierungs-Endpunkt |
| `token_endpoint` | Token-Endpunkt |
| `userinfo_endpoint` | Benutzerinformations-Endpunkt |
| `jwks_uri` | Öffentlicher Schlüsselsatz (JWKS)-Adresse |
| `end_session_endpoint` | RP-Initiated Logout Endpunkt (von RP-Initiated Logout Spezifikation definiert) |
| `registration_endpoint` | Dynamischer Client-Registrungs-Endpunkt (falls unterstützt) |
| `scopes_supported` | Unterstützte Scope-Liste |
| `response_types_supported` | Unterstützte response_type |
| `subject_types_supported` | `public` / `pairwise` |
| `id_token_signing_alg_values_supported` | ID-Token-Signatur-Algorithmen, RP setzt danach Whitelist |
| `token_endpoint_auth_methods_supported` | Token-Endpunkt Client-Authentifizierungsmethoden, z. B. `client_secret_basic`, `private_key_jwt` |
| `claims_supported` | Rückgabbare Claims-Liste (informativ) |
| `code_challenge_methods_supported` | Unterstützte PKCE-Methoden, sollte `S256` enthalten |
| `frontchannel_logout_supported` / `backchannel_logout_supported` | Unterstützt Front-/Back-Channel Logout |

## prompt-Wert-Tabelle

| Wert | Verhalten | Typischer Zweck |
|------|------|----------|
| `none` | OP zeigt keine UI; ohne Sitzung oder wenn Interaktion erforderlich, direkt Fehler zurückgeben (z. B. `login_required`) | Sitzungs-Status überprüfen / SSO-Erkennung / Token-Verlängerung |
| `login` | Erzwingt Neauthentifizierung, auch mit Sitzung | Zweite Bestätigung vor sensiblem Vorgang (step-up) |
| `consent` | Erzwingt erneute Genehmigungsseite | Benutzer muss Genehmigung erneut erteilen |
| `select_account` | Zeige Kontoauswahl-UI | Benutzer hat mehrere Konten, erlaubt Wechsel |

`prompt` kann kombiniert werden (z. B. `login consent`), aber `none` kann nicht mit anderen Werten gemischt werden.

## OIDC neu hinzugefügte Fehlercodes

Neben OAuth2-Fehlercodes (`invalid_request`, `access_denied`, `invalid_grant` usw., siehe [OAuth2-Dokumentation](../oauth2/)) fügt OIDC am authorization endpoint hinzu:

| Fehlercode | Bedeutung | Typische Auslöser |
|--------|------|----------|
| `login_required` | Benutzer muss anmelden, Interaktion aber nicht erlaubt | `prompt=none` und OP hat keine aktive Sitzung |
| `consent_required` | Benutzer muss genehmigen, Interaktion aber nicht erlaubt | `prompt=none` und dieser Client hat noch keine Zustimmung |
| `interaction_required` | Gewisse Benutzer-Interaktion erforderlich, aber nicht erlaubt | `prompt=none` Fallback-Fehler |
| `account_selection_required` | Benutzer muss Konto wählen, Interaktion aber nicht erlaubt | `prompt=none` und mehrere Konto-Sitzungen |
| `invalid_request_uri` | `request_uri` kann nicht abgerufen oder Inhalt ist ungültig | Mit PAR/request_uri Szenarios |
| `invalid_request_object` | Request-Objekt (JWT) ist ungültig | Mit signiertem Request-Objekt (JAR) Szenarios |
| `request_not_supported` / `request_uri_not_supported` | OP unterstützt request(_uri)-Parameter nicht | Fähigkeit nicht erfüllt |
| `registration_not_supported` | OP unterstützt registration-Parameter nicht | Fähigkeit nicht erfüllt |

::: tip
`login_required` ist normales Signal, nicht Fehler: Bei stiller Verlängerung (`prompt=none`) sollte auf regulären Login mit Interaktion zurückfallen.
:::

## Troubleshooting-Schnelleinsicht

| Erscheinungsbild | Häufige Ursache |
|------|----------|
| Callback zeigt `redirect_uri_mismatch` / `invalid_request` | redirect_uri unterscheidet sich vom registrierten Wert (Protokoll, Port, Trailing Slash, Groß-/Kleinschreibung) |
| Token-Antwort hat kein `id_token` | Request `scope` vergaß `openid` |
| ID-Token-Validierung fehlgeschlagen: `iss` nicht kompatibel | Issuer-Konfiguration mit/ohne Trailing Slash inkonsistent; Multi-Tenant OP, falsche Mieter-URL |
| ID-Token-Validierung fehlgeschlagen: Signatur ungültig / `kid` nicht gefunden | JWKS-Cache abgelaufen (OP hat Schlüssel rotiert), JWKS auffrischen erforderlich; oder Umgebung falsch konfiguriert, JWKS von anderem OP |
| ID-Token-Validierung fehlgeschlagen: `aud` nicht kompatibel | Andere Anwendungs-`client_id` verwendet; oder Token von anderem Client validiert |
| nonce-Validierung fehlgeschlagen | Sitzung verloren (Callback bei anderer Instanz, Session nicht freigegeben), oder Cookie SameSite-Einstellung führt dazu, dass Callback-Anfrage kein Sitzungs-Cookie trägt |
| `invalid_grant` (Token-Wechsel fehlgeschlagen) | Autorisierungscode bereits verwendet/abgelaufen (Code nur einmal, Browserprefetch oder wiederholter Callback zu beachten); PKCE `code_verifier` stimmt nicht mit `code_challenge` überein; redirect_uri unterscheidet sich von Autorisierungs-Anfrage |
| `prompt=none` gibt immer `login_required` zurück | OP keine Sitzung (Third-Party-Cookie von Browser blockiert ist häufige Ursache); oder OP-Seite erfordert Neuzustimmung |
| Nach Abmeldung ist nach Seiten-Refresh noch Anmeldestatus | Nur RP-Sitzung gelöscht, nicht zu `end_session_endpoint` umgeleitet, wird stillschweigend von OP SSO-Sitzung erneut angemeldet |
| Nach Abmeldung kein Sprung zurück zu App | `post_logout_redirect_uri` nicht auf OP-Seite registriert, oder `id_token_hint` nicht übergeben, OP kann Client nicht verknüpfen |
| Kann `email`/`name` usw. Claims nicht erhalten | Entsprechender Scope nicht angefordert; oder OP gibt diese Claims nur in UserInfo zurück, RP hat nur ID Token analysiert |
| `exp`/`iat`-Validierung zeitweise fehlgeschlagen | Server-Zeitabweichung, NTP konfigurieren und ≤5 Minuten Clock-Skew erlauben |
