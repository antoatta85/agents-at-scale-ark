terraform {
  backend "gcs" {}

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 7.0.0, < 8"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 7.0.0, < 8"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
}
