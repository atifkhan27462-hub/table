import pytest
from fastapi.testclient import TestClient


def test_list_initial_modular_games(client: TestClient):
    """Verify all 6 initial modular games are seeded and returned."""
    res = client.get("/api/v1/games")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 6

    slugs = {g["slug"] for g in data}
    expected_slugs = {
        "tic-tac-toe",
        "memory-match",
        "ludo-game",
        "restaurant-quiz",
        "simple-puzzle",
        "chess",
    }
    assert expected_slugs.issubset(slugs)


def test_get_individual_game_details(client: TestClient):
    """Verify fetching individual game by slug."""
    res = client.get("/api/v1/games/chess")
    assert res.status_code == 200
    game = res.json()["data"]
    assert game["title"] == "Classic Tabletop Chess"
    assert game["category"] == "Strategy"
    assert game["min_players"] == 2
    assert game["max_players"] == 2
    assert "board_theme" in game["config"]


@pytest.fixture
def admin_headers(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_enable_disable_game(client: TestClient, admin_headers):
    """Verify restaurant manager can disable and enable a game."""
    # 1. Disable Chess
    res_disable = client.patch(
        "/api/v1/games/chess",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert res_disable.status_code == 200
    assert res_disable.json()["data"]["is_active"] is False

    # 2. Check public listing (should NOT include disabled chess)
    res_public = client.get("/api/v1/games")
    public_slugs = [g["slug"] for g in res_public.json()["data"]]
    assert "chess" not in public_slugs

    # 3. Check admin listing (should include disabled chess)
    res_admin = client.get("/api/v1/games/admin", headers=admin_headers)
    admin_slugs = [g["slug"] for g in res_admin.json()["data"]]
    assert "chess" in admin_slugs

    # 4. Re-enable Chess
    res_enable = client.patch(
        "/api/v1/games/chess",
        json={"is_active": True},
        headers=admin_headers,
    )
    assert res_enable.status_code == 200
    assert res_enable.json()["data"]["is_active"] is True


def test_admin_schedule_game_promotion(client: TestClient, admin_headers):
    """Verify scheduling a win promotional reward code on a game."""
    res_promo = client.post(
        "/api/v1/games/restaurant-quiz/promotion",
        json={
            "promotion_active": True,
            "promotion_text": "Score 80%+ on Food & Wine Trivia to unlock 15% off dessert!",
            "promotion_code": "TRIVIA15",
            "promotion_discount_percent": 15,
        },
        headers=admin_headers,
    )
    assert res_promo.status_code == 200
    data = res_promo.json()["data"]
    assert data["promotion_active"] is True
    assert data["promotion_code"] == "TRIVIA15"
    assert data["promotion_discount_percent"] == 15


def test_games_isolation_no_session_or_order_side_effects(client: TestClient, admin_headers):
    """
    CRITICAL CONSTRAINT: Games must not interfere with:
    - customer session
    - cart
    - active order
    - payment
    """
    # 1. Verify existing active orders count
    orders_before = client.get("/api/v1/orders").json()["data"]
    tables_before = client.get("/api/v1/tables").json()["data"]

    # 2. Perform various game operations
    client.get("/api/v1/games")
    client.patch("/api/v1/games/tic-tac-toe", json={"title": "Tic Tac Toe Arena"}, headers=admin_headers)
    client.post(
        "/api/v1/games/tic-tac-toe/promotion",
        json={"promotion_active": True, "promotion_code": "WINNER"},
        headers=admin_headers,
    )

    # 3. Verify zero mutation to orders or table session states
    orders_after = client.get("/api/v1/orders").json()["data"]
    tables_after = client.get("/api/v1/tables").json()["data"]

    assert len(orders_after) == len(orders_before)
    assert len(tables_after) == len(tables_before)
