terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.0.0"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
	subscription_id = "79b09db3-e27d-47e7-aff3-782a94820f8f"
	client_id = "f16d5847-e249-4561-95b8-3d8de7a7c033"
	client_secret = "Tg98Q~vVxRmw9DHoZcn7kjVBH4--thIQVmlVKaza"
	tenant_id = "fa6fa535-89db-4411-abac-9d7ff8e9a506"
}

resource "azurerm_resource_group" "rg1" {
    name = "test"
    location = "East US"
}

resource "azurerm_virtual_network" "myvnet" {
  name = "vnet1"
  location = azurerm_resource_group.rg1.location
  address_space = ["10.0.0.0/16"]
  resource_group_name = azurerm_resource_group.rg1.name
}

resource "azurerm_subnet" "subnet1" {
  name = "frontend"
  virtual_network_name = azurerm_virtual_network.myvnet.name
  address_prefixes = ["10.0.0.0/25"]
  resource_group_name = azurerm_resource_group.rg1.name
}
