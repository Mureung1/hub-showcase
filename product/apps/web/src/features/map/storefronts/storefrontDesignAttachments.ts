import * as THREE from "three";

import type { StorefrontDesignSpec } from "./storefrontDesignCatalog";
import {
  addCommunityDesignAttachment,
  addFoodDesignAttachment,
  addRetailDesignAttachment,
} from "./storefrontDesignAttachmentGroups";

export function addStorefrontDesignAttachment(
  model: THREE.Group,
  spec: StorefrontDesignSpec,
  roofTop: number,
) {
  const marker = new THREE.Group();
  marker.name = `design-marker-${spec.id}`;
  marker.position.y = roofTop;

  addFoodDesignAttachment(marker, spec);
  addRetailDesignAttachment(marker, spec);
  addCommunityDesignAttachment(marker, spec);
  model.add(marker);
  return marker;
}
