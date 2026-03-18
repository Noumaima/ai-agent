resource "proxmox_virtual_environment_vm" "nodes" {
  count     = var.vm_count
  name      = local.vm_names[count.index]
  node_name = var.proxmox_node

  # Clone depuis template
  clone {
    vm_id = data.proxmox_virtual_environment_vm.template.id
  }

  agent {
    enabled = true
  }

  cpu {
    cores = var.cpu_cores
    type  = "host"
  }

  memory {
    dedicated = var.memory_mb
  }

  disk {
    datastore_id = var.datastore
    size         = "${var.disk_gb}G"
    interface    = "scsi0"
  }

  network_device {
    bridge = var.bridge
    model  = "virtio"
  }

  initialization {
    user_account {
      username = var.vm_user
      keys     = [var.ssh_public_key]
    }

    dns {
      servers = var.dns_servers
    }

    ip_config {
      ipv4 {
        address = "${local.vm_ips[count.index]}/${var.subnet_cidr_prefix}"
        gateway = var.gateway
      }
    }
  }
}

data "proxmox_virtual_environment_vm" "template" {
  node_name = var.proxmox_node
  name      = var.template_name
}

