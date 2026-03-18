#!/usr/bin/env bash
set -euo pipefail

curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

echo "K3s server installed."
sudo cat /var/lib/rancher/k3s/server/node-token