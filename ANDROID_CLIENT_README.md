# Android Client — Digital Menu

Cahier des charges à donner à Gemini pour créer une application Android Studio native qui reproduit le menu client web du projet MENU.

## Objectif

Créer une application mobile qui affiche le restaurant, les catégories et les plats, permet la recherche, le panier persistant, la commande sur place, la réservation, l’authentification client, l’envoi d’une commande et le suivi de son état.

L’interface doit être en français, mobile-first, avec fond crème, texte sombre, accents dorés/orangés, cartes arrondies, catégories horizontales et panier toujours accessible.

## Stack recommandée

Kotlin, Android Studio récent, Jetpack Compose + Material 3, Navigation Compose, MVVM, ViewModel + StateFlow + Coroutines, Retrofit + OkHttp, Kotlin Serialization ou Gson, Coil pour les images, DataStore ou Room pour panier/session, minSdk 26.

Structure :

    data/model
    data/remote
    data/local
    data/repository
    ui/screens/menu
    ui/screens/cart
    ui/screens/checkout
    ui/screens/auth
    ui/screens/order_status
    ui/components
    viewmodel

## Backend et Base URL

Le backend est Node.js/Express.

    Production : https://TON-DOMAINE.example/
    Émulateur Android + serveur local : http://10.0.2.2:5000/

La Base URL doit être configurable avec BuildConfig.BASE_URL ou local.properties. Ne jamais mettre MongoDB, mot de passe ou secret dans l’application.

Routes existantes :

    GET  /api/settings
    GET  /UserMenu
    GET  /menu-image/{id}
    POST /Order_Details
    GET  /UserMenu/order-status?orderId={id}
    POST /api/orders/{orderId}/rating
    POST /UserMenu_SignUp
    POST /UserMenu_loginpage
    GET  /UserMenu_logout

### Vérification du déploiement réel

Le déploiement fourni par le client est :

    https://lepatio-djerba.vercel.app/

Vérifications effectuées le 5 novembre 2026 :

    GET https://lepatio-djerba.vercel.app/health       -> 200, ok
    GET https://lepatio-djerba.vercel.app/api/settings -> 200
    GET https://lepatio-djerba.vercel.app/api/menu      -> 404
    GET https://lepatio-djerba.vercel.app/UserMenu      -> 200, HTML du menu

La réponse réelle de /api/settings est :

    {
      "restaurantName": "Le Patio Djerba",
      "address": "Marina 4180 Houmt Souk Djerba, Tunis",
      "phone": "+216 75 000 000",
      "openingHours": "08:00 - 23:00 (Tous les jours)",
      "currency": "DNT"
    }

Le menu live contient 176 articles répartis dans ces catégories : Petit déj, Monde des douceurs, Nos délices, Burger, Plats, Sandwich, Jus Frais, Mocktails, Milkshake, Smoothies, Frappoccino, Iced tea, Cafés glacés, Saveurs salées, Boissons chaudes, Nos citronnades, Eau, Boissons gazeuses, Viennoiseries et CAFE.

Les images live sont accessibles avec une URL relative comme :

    https://lepatio-djerba.vercel.app/menu-image/{id}

La liste actuelle contient les tables 1 à 20. Les capacités visibles sont : tables 1–4, 7–10, 15–16 et 19–20 avec 4 places ; tables 5–6 et 13–14 avec 2 places ; tables 11–12 et 17–18 avec 6 places.

Le fichier local .env contient seulement les noms PORT, MONGODB_DNS_SERVERS et MONGODB_URI. Ces variables sont nécessaires au serveur, pas à l’application Android. L’application Android a uniquement besoin de BASE_URL = https://lepatio-djerba.vercel.app/.

## API menu indispensable

/UserMenu rend actuellement du HTML Handlebars. L’application native ne doit pas parser cette page. Ajouter au backend :

    GET /api/menu

Réponse recommandée :

    {
      "success": true,
      "restaurant": {
        "restaurantName": "Le Patio Djerba",
        "address": "Marina 4180 Houmt Souk Djerba, Tunis",
        "phone": "+216 75 000 000",
        "openingHours": "08:00 - 23:00 (Tous les jours)",
        "currency": "DNT"
      },
      "categories": [
        { "id": "category-id", "title": "Plats", "description": "..." }
      ],
      "items": [
        {
          "id": "menu-item-id",
          "title": "Couscous",
          "description": "Description",
          "price": 18.5,
          "size": "Normal",
          "category": "Plats",
          "isAvailable": true,
          "imageUrl": "/menu-image/menu-item-id"
        }
      ],
      "tables": [
        { "number": 1, "zone": "Main room", "seats": 4, "shape": "square" }
      ]
    }

Si cette route n’existe pas, commencer avec un repository mock interchangeable puis brancher Retrofit. Ne pas supprimer le menu web.

Pour la version actuellement déployée, Gemini doit d’abord prévoir ce fallback : appeler /api/settings, puis utiliser /api/menu après l’ajout de cette route. Le scraping HTML de /UserMenu peut servir uniquement à vérifier les données ou à générer un seed de développement ; il ne doit pas être l’architecture finale de l’application.

## Modèles

MenuItem : id, title, description, price, size, category, isAvailable, imageUrl.

Category : id, title, description.

Table : number, zone, seats, shape.

CartItem : item MenuItem, quantity Int, lineTotal = price * quantity.

Article de commande : itemName, itemPrice, itemQty, status.

Statuts exacts :

    pending  = En attente
    en_cours = En cours
    pret     = Prêt
    cancel   = Annulée

## Écrans

### Menu principal

Header restaurant, adresse, téléphone, horaires, recherche, catégories horizontales, cartes de plats, placeholder d’image, prix à deux décimales, badge Indisponible, bouton Ajouter désactivé si isAvailable=false, compteur panier, pull-to-refresh, loading/error/empty states.

### Détail plat

Grande image, titre, description, taille, prix, quantité +/- et bouton Ajouter au panier.

### Panier

Articles, quantités, suppression, sous-total, total, devise dynamique et bouton Commander. Le web utilise price * quantity et des frais de livraison égaux à zéro. Le panier doit survivre à la fermeture de l’app.

### Checkout

Mode dine-in : nombre de personnes obligatoire, table obligatoire, commentaire optionnel max 800 caractères, nom/téléphone/email si non connecté.

Mode reservation : nom, téléphone, nombre de personnes, date et heure obligatoires ; commentaire optionnel ; table non obligatoire.

### Authentification

Écrans connexion, inscription, profil/session et logout. Inscription : username, phonenumber, email, password.

Le backend actuel utilise des redirects HTML et stocke encore le mot de passe client en clair. Pour la production, ajouter :

    POST /api/client/auth/register
    POST /api/client/auth/login
    POST /api/client/auth/logout
    GET  /api/client/me

Utiliser bcrypt côté backend et un token/session sécurisé. Ne jamais stocker un mot de passe en clair sur Android.

## Envoi de commande

Envoyer POST /Order_Details avec :

    {
      "name": "Ahmed",
      "PhoneNumber": "+21600000000",
      "email": "ahmed@example.com",
      "serviceType": "dine-in",
      "seatCount": 2,
      "TableNumber": 4,
      "reservationDate": "",
      "reservationTime": "",
      "comment": "Sans oignon",
      "items": [
        { "itemName": "Couscous", "itemPrice": 18.5, "itemQty": 2 }
      ],
      "totalPrice": 37.0
    }

Règles : serviceType vaut dine-in ou reservation, seatCount >= 1, TableNumber >= 1 pour dine-in, commentaire max 800 caractères et au moins un article.

Réponse HTTP 201 :

    {
      "success": true,
      "message": "Order submitted successfully.",
      "orderId": "mongodb-object-id",
      "orderIdDisplay": "ABC123"
    }

Après succès : sauvegarder orderId, vider le panier, afficher confirmation, ouvrir le suivi et empêcher les doubles envois. Le backend devrait recalculer prix et total depuis la base.

## Suivi de commande

Appeler :

    GET /UserMenu/order-status?orderId={orderId}

La réponse contient orders, readyItems, orderIdDisplay, serviceTypeLabel, tableDisplay, reservationLabel et les articles avec leur status.

Rafraîchir toutes les 10–15 secondes seulement quand l’écran est visible, arrêter le polling en quittant l’écran et ajouter un refresh manuel.

## QR code

Un QR peut ouvrir :

    https://lepatio-djerba.vercel.app/UserMenu?table=4

Lire table=4, présélectionner la table au checkout, la conserver pendant la session et prévoir une option pour verrouiller la table venant du QR.

## Retrofit

    interface MenuApi {
        @GET("api/menu")
        suspend fun getMenu(): MenuResponse

        @GET("api/settings")
        suspend fun getSettings(): RestaurantSettings

        @POST("Order_Details")
        suspend fun submitOrder(
            @Body request: CreateOrderRequest
        ): Response<OrderResponse>

        @GET("UserMenu/order-status")
        suspend fun getOrderStatus(
            @Query("orderId") orderId: String
        ): OrderStatusResponse

        @POST("api/orders/{orderId}/rating")
        suspend fun rateOrder(
            @Path("orderId") orderId: String,
            @Body request: RatingRequest
        ): Response<Unit>
    }

Erreurs : 400 validation, 401/403 reconnexion, 404 introuvable, 500 retry, timeout/no internet cache + message offline.

## Critères d’acceptation

Gemini doit livrer un projet qui compile, une architecture MVVM, aucun métier codé dans les écrans, un mock remplaçable par Retrofit, panier persistant, checkout dans les deux modes, validations, envoi compatible avec POST /Order_Details, confirmation avec orderIdDisplay, suivi des quatre statuts, loading/error/empty/offline, tests unitaires du panier et des validations, et un README de lancement.

## Prompt à copier dans Gemini

    Crée une application Android native en Kotlin avec Jetpack Compose pour le projet Digital Menu décrit dans ANDROID_CLIENT_README.md. Reproduis le menu client web : catégories, recherche, cartes de plats, images, disponibilité, panier persistant, checkout commande sur place/réservation, authentification client et suivi de commande. Utilise MVVM, Repository, StateFlow, Retrofit, Coil, Navigation Compose et DataStore/Room. Commence par un repository mock si GET /api/menu n’existe pas, mais garde une interface prête pour Retrofit. N’invente pas de champs incompatibles avec POST /Order_Details. Implémente loading, erreur, empty, offline, validations, deep link table depuis ?table=4 et tests du panier. Donne le code fichier par fichier et les étapes exactes pour compiler dans Android Studio.

### Prompt final complet pour Gemini

    Tu es un développeur Android senior. Crée une application Android Studio native en Kotlin pour le restaurant Le Patio Djerba. Le cahier des charges complet est dans ANDROID_CLIENT_README.md.

    Base URL de production : https://lepatio-djerba.vercel.app/
    Endpoint de santé : GET /health
    Endpoint settings fonctionnel : GET /api/settings
    Important : GET /api/menu renvoie actuellement 404. Ne scrape pas le HTML comme solution finale. Prépare un MenuRepository avec une source mock et une source Retrofit, et indique le code Express nécessaire pour ajouter GET /api/menu en retournant les catégories, les 176 articles live, les prix, la disponibilité, les images et les tables.

    Crée l’application avec Kotlin, Jetpack Compose, Material 3, MVVM, Repository, ViewModel, StateFlow, Coroutines, Retrofit, OkHttp, Kotlin Serialization, Coil, Navigation Compose et DataStore ou Room. Utilise une architecture propre et du code compilable.

    Écrans obligatoires : menu principal, recherche, catégories, détail plat, panier persistant, checkout, login, signup, profil/logout, confirmation de commande et suivi de commande.

    Le menu doit afficher 20 catégories réelles : Petit déj, Monde des douceurs, Nos délices, Burger, Plats, Sandwich, Jus Frais, Mocktails, Milkshake, Smoothies, Frappoccino, Iced tea, Cafés glacés, Saveurs salées, Boissons chaudes, Nos citronnades, Eau, Boissons gazeuses, Viennoiseries et CAFE. Les images utilisent BASE_URL + /menu-image/{id}.

    Implémente le panier avec price * quantity, frais de livraison zéro, persistance locale, modification de quantité, suppression, total en DNT et blocage du bouton si l’article est indisponible.

    Le checkout doit supporter dine-in et reservation. Pour dine-in : seatCount et TableNumber obligatoires. Pour reservation : nom, téléphone, date et heure obligatoires. Le commentaire est optionnel, maximum 800 caractères.

    Envoie la commande en JSON vers POST /Order_Details avec exactement ces champs : name, PhoneNumber, email, serviceType, seatCount, TableNumber, reservationDate, reservationTime, comment, items[itemName,itemPrice,itemQty], totalPrice. Après HTTP 201, sauvegarde orderId, vide le panier, affiche orderIdDisplay et ouvre le suivi.

    Le suivi utilise GET /UserMenu/order-status?orderId={id}. Les statuts sont pending, en_cours, pret et cancel. Rafraîchis toutes les 10 à 15 secondes uniquement quand l’écran est visible. Ajoute un refresh manuel et gère offline, timeout, 400, 401, 404 et 500.

    Supporte le deep link ou query parameter ?table=4 venant d’un QR code. Il doit présélectionner la table au checkout.

    Pour l’authentification native, recommande d’ajouter côté backend POST /api/client/auth/register, POST /api/client/auth/login, POST /api/client/auth/logout et GET /api/client/me avec bcrypt et token sécurisé. Le backend actuel utilise des formulaires HTML et ne doit pas être copié tel quel dans une app native.

    Donne la réponse fichier par fichier : settings.gradle, build.gradle, AndroidManifest.xml, modèles, API Retrofit, repository, DataStore/Room, ViewModels, navigation, composants Compose, tous les écrans, tests unitaires et README de compilation. Ne mets aucun secret, URI MongoDB ou mot de passe dans le projet. Commence par une version compilable avec données mockées, puis montre exactement comment activer l’API de production.

