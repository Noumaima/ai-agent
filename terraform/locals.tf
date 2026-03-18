locals {
  # Convertit ip_start en base + offset simple (on reste pragmatique)
  # Ex ip_start=192.168.1.101 -> on prendra .101, .102, .103 ...
  ip_parts = split(".", var.ip_start)
  ip_base  = join(".", slice(local.ip_parts, 0, 3))
  ip_last  = tonumber(local.ip_parts[3])

  vm_names = [
    for i in range(var.vm_count) :
    format("%s-%02d", var.cluster_name, i + 1)
  ]

  vm_ips = [
    for i in range(var.vm_count) :
    format("%s.%d", local.ip_base, local.ip_last + i)
  ]
}