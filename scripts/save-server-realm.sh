#!/usr/bin/env bash

docker exec -it keycloak-testing-container /opt/keycloak/bin/kc.sh export --file /opt/keycloak/data/import/realm.json --realm myrealm