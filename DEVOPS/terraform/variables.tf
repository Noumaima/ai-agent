variable "proxmox_endpoint" {
  description = "Ex: https://pve.example.com:8006/api2/json"
  type        = string
}

variable "proxmox_api_token" {
  description = "Ex: root@pam!terraform=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "True si certificat Proxmox self-signed"
  type        = bool
  default     = true
}

variable "proxmox_node" {
  description = "Nom du node Proxmox (ex: pve1)"
  type        = string
}

variable "template_name" {
  description = "Nom exact du template cloud-init dans Proxmox"
  type        = string
}

variable "bridge" {
  description = "Bridge réseau Proxmox (ex: vmbr0)"
  type        = string
  default     = "vmbr0"
}

variable "datastore" {
  description = "Storage target (ex: local-lvm)"
  type        = string
}

variable "vm_user" {
  description = "Utilisateur initial cloud-init"
  type        = string
  default     = "ubuntu"
}

variable "ssh_public_key" {
  description = "Clé SSH publique à injecter dans les VMs"
  type        = string
}

variable "dns_servers" {
  type        = list(string)
  default     = ["1.1.1.1", "8.8.8.8"]
}

variable "gateway" {
  description = "Gateway réseau (ex: 192.168.1.1)"
  type        = string
}

variable "subnet_cidr_prefix" {
  description = "Préfixe CIDR (ex: 24)"
  type        = number
  default     = 24
}

variable "cluster_name" {
  type    = string
  default = "pve-cluster"
}

variable "vm_count" {
  description = "Nombre total de VMs à créer"
  type        = number
  default     = 3
}

variable "ip_start" {
  description = "IP de départ pour les VMs (ex: 192.168.1.101)"
  type        = string
}

variable "cpu_cores" {
  type    = number
  default = 2
}

variable "memory_mb" {
  type    = number
  default = 2048
}

variable "disk_gb" {
  type    = number
  default = 20
}