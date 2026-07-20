export function groupBuyRowToDto(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetPeople: row.target_people,
    currentPeople: row.current_people,
    deadline: row.deadline,
    pickupLocation: row.pickup_location,
    status: row.status,
    ownerId: row.owner_id,
    hostName: row.host_name,
    unitPrice: row.unit_price,
    shippingFee: row.shipping_fee,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

export function newGroupBuyToRow(input, ownerId) {
  return {
    category: input.category,
    current_people: 1,
    deadline: input.deadline,
    host_name: "나",
    name: input.name,
    owner_id: ownerId,
    pickup_location: input.pickupLocation,
    shipping_fee: input.shippingFee,
    stage: "모집 중",
    status: "open",
    target_people: input.targetPeople,
    unit_price: input.unitPrice,
  };
}

function groupBuyPatchToRow(input) {
  const columns = {
    category: "category",
    deadline: "deadline",
    name: "name",
    pickupLocation: "pickup_location",
    shippingFee: "shipping_fee",
    targetPeople: "target_people",
    unitPrice: "unit_price",
  };

  return Object.fromEntries(
    Object.entries(columns)
      .filter(([field]) => Object.hasOwn(input, field))
      .map(([field, column]) => [column, input[field]]),
  );
}

export function createGroupBuyRepository(supabase) {
  return {
    async create(input, ownerId) {
      const { data, error } = await supabase
        .from("group_buys")
        .insert(newGroupBuyToRow(input, ownerId))
        .select("*")
        .single();

      if (error) throw error;
      return groupBuyRowToDto(data);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("group_buys")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data ? groupBuyRowToDto(data) : null;
    },

    async list() {
      const { data, error } = await supabase
        .from("group_buys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(groupBuyRowToDto);
    },

    async remove(id) {
      const { data, error } = await supabase
        .from("group_buys")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    },

    async update(id, input) {
      const { data, error } = await supabase
        .from("group_buys")
        .update(groupBuyPatchToRow(input))
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data ? groupBuyRowToDto(data) : null;
    },
  };
}
