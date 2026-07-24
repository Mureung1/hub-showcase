export function groupBuyRowToDto(row) {
  const participants = (row.group_buy_participants ?? []).map((participant, index) => ({
    createdAt: participant.created_at,
    id: participant.id,
    nickname: participant.nickname || `참여자 ${index + 2}`,
    quantity: participant.quantity,
    startLocation: participant.start_location,
    userId: participant.user_id,
  }));
  const voteRows = row.group_buy_votes ?? [];
  const votes = voteRows.reduce((counts, vote) => ({
    ...counts,
    [vote.candidate]: (counts[vote.candidate] ?? 0) + 1,
  }), {});
  const voterChoices = Object.fromEntries(voteRows.map((vote) => [vote.user_id, vote.candidate]));

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetPeople: row.target_people,
    currentPeople: row.current_people,
    deadline: row.deadline,
    finalPickup: row.final_pickup,
    pickupLocation: row.pickup_location,
    status: row.status,
    ownerId: row.owner_id,
    hostName: row.host_name,
    unitPrice: row.unit_price,
    shippingFee: row.shipping_fee,
    stage: row.stage,
    createdAt: row.created_at,
    participants,
    voterChoices,
    votes,
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
    async create(input, ownerId, hostName = "나") {
      const { data, error } = await supabase
        .from("group_buys")
        .insert({ ...newGroupBuyToRow(input, ownerId), host_name: hostName })
        .select("*")
        .single();

      if (error) throw error;
      return groupBuyRowToDto(data);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("group_buys")
        .select("*, group_buy_participants(*), group_buy_votes(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data ? groupBuyRowToDto(data) : null;
    },

    async list() {
      const { data, error } = await supabase
        .from("group_buys")
        .select("*, group_buy_participants(*), group_buy_votes(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(groupBuyRowToDto);
    },

    async join(id, userId, nickname, input) {
      const { error } = await supabase.rpc("join_group_buy", {
        participant_nickname: nickname,
        participant_quantity: input.quantity,
        participant_start_location: input.startLocation,
        participant_user_id: userId,
        target_group_buy_id: id,
      });

      if (error) throw error;
      return this.findById(id);
    },

    async cancelParticipation(id, userId) {
      const { error } = await supabase.rpc("cancel_group_buy_participation", {
        participant_user_id: userId,
        target_group_buy_id: id,
      });

      if (error) throw error;
      return this.findById(id);
    },

    async vote(id, userId, candidate) {
      const { error } = await supabase.rpc("vote_group_buy", {
        selected_candidate: candidate,
        target_group_buy_id: id,
        voter_user_id: userId,
      });

      if (error) throw error;
      return this.findById(id);
    },

    async finalizePickup(id, userId) {
      const { error } = await supabase.rpc("finalize_group_buy_pickup", {
        requester_user_id: userId,
        target_group_buy_id: id,
      });

      if (error) throw error;
      return this.findById(id);
    },

    async advanceStage(id, stage) {
      const { error } = await supabase
        .from("group_buys")
        .update({ stage })
        .eq("id", id);

      if (error) throw error;
      return this.findById(id);
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
        .select("*, group_buy_participants(*), group_buy_votes(*)")
        .maybeSingle();

      if (error) throw error;
      return data ? groupBuyRowToDto(data) : null;
    },
  };
}
