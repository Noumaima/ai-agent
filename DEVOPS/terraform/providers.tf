provider "proxmox" {
  endpoint = var.proxmox_endpoint
  api_token = var.proxmox_api_token

  # si tu as un certificat self-signed
  insecure = var.proxmox_insecure
}