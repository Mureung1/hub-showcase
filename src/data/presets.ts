import { ClothingItem } from "../types";

export const DEFAULT_CLOSET: ClothingItem[] = [
  {
    id: "preset-bomber",
    name: "Neo-Tokyo Bomber",
    category: "top",
    colors: ["Lavender", "Neon Pink"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFzJwbS6aZUbAAvQ8G06pvaJwlHXgNZoCl0Se7nLEwGsgQqgaDXBAHeQ5QlwvR-A0mjQRU9yITG2uttl61qMG0uy04BGp_HdMqWs0Kcb7L3EYlfvsa9al7MVoAnekf_0IybsQjpVXywaguTDPQ_qDsPrhsniU38QLMghIflLsOEGe96APGBdg6e2ipYi90h5oW2KXn-uhWu9ngOam2H6FGcfQQEnkB0108z5_CQSnYdIrh_sCOYl4jIiMQm6pS1qD30z6e9TTF89q_",
    isCustom: false
  },
  {
    id: "preset-skirt",
    name: "Digital Pleat Skirt",
    category: "bottom",
    colors: ["Dark Purple", "Cyber Indigo"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDsSchHaaiOEzQlB49jNwknWsdv10BertIPF5HDuVurMBpybcrF_RAK6ZI4oRjJIHZHxlTvuCXRDmL2tw0NDbGTKkHP2_KmeBD36h8E4RQpNzyYcNQn_hZb4ZLa_cH6l5tJOhmiPy4URuG0TXxvrTtyH8QZo9gNkgeaEM7NnogKHSmJsOMamuT9RhM5Y5VHm5iJQxAgAvQwmC7PpljWMHS6SSgjqTmi5oCjfsKxJc34N_3seMG6Ivyc4XGJjSlHrGnL1nk94YiRsM8S",
    isCustom: false
  },
  {
    id: "preset-walkers",
    name: "Cloud Walkers V2",
    category: "shoes",
    colors: ["White", "Neon Violet"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvyelT9tIk7N4n16vewsNvVOj7LwqlQxv6VOuvGqb0FylmjTzaUuoKPmRCvmpaviFzyLEXkQi3Ibb75LA6dKDQ2q5AzRjCy7k2WjxSeJCY7_zoeZadvxyvAOqxGiHpP0OX-1m8tss6iMiMwD5AHXrI8lOBugWNfmCGoN0QcK8A2jh4_AwZe4af7hGr1eicr0QmQJdOg7c_6LN4uxcBmRwaKoKJIWGtTKfLNhrM3psCvxB3A15V09JfdpbSfcxX8aeXfgyf0X9Nrt6w",
    isCustom: false
  },
  {
    id: "preset-kicks",
    name: "Cyber Kicks V.1",
    category: "shoes",
    colors: ["Cyan", "Black"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDnaxS-_nnB9ghKAMa47xRR4yKpxJQ6PnoHmFanSYK8wEwKijM1e0PGrYqnlORzbmB9rJ_I1mr6-JNGjVAkhXQOF_1m-dGHlBf4ZMxsnPJMzphKNGitf6b3Z4cAbYlqKSzz2SfjzqtxL3joj2d3vdTSzpxS7yudWQIm_yVChdrlXe1OhwFOJehiVnO3fIjVP-J5wFTbBE9UCH_Oy2Hl5jlAqqhSOUM8CQU94qzAW6g7ze1Ki-iWMzIv6jcmjfebUE9C9pFOrWNjwRP",
    isCustom: false
  }
];

export interface TemplatePreset {
  name: string;
  category: "top" | "bottom" | "shoes" | "accessories";
  colors: string[];
  imageUrl: string;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: "Toxic Bomber Jacket",
    category: "top",
    colors: ["Purple", "Neon Lime"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFzJwbS6aZUbAAvQ8G06pvaJwlHXgNZoCl0Se7nLEwGsgQqgaDXBAHeQ5QlwvR-A0mjQRU9yITG2uttl61qMG0uy04BGp_HdMqWs0Kcb7L3EYlfvsa9al7MVoAnekf_0IybsQjpVXywaguTDPQ_qDsPrhsniU38QLMghIflLsOEGe96APGBdg6e2ipYi90h5oW2KXn-uhWu9ngOam2H6FGcfQQEnkB0108z5_CQSnYdIrh_sCOYl4jIiMQm6pS1qD30z6e9TTF89q_"
  },
  {
    name: "Holo Grid Crop Top",
    category: "top",
    colors: ["Holo Blue", "Neon White"],
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=200"
  },
  {
    name: "Glitch Pleat Skirt",
    category: "bottom",
    colors: ["Plaid", "Neon Pink"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDsSchHaaiOEzQlB49jNwknWsdv10BertIPF5HDuVurMBpybcrF_RAK6ZI4oRjJIHZHxlTvuCXRDmL2tw0NDbGTKkHP2_KmeBD36h8E4RQpNzyYcNQn_hZb4ZLa_cH6l5tJOhmiPy4URuG0TXxvrTtyH8QZo9gNkgeaEM7NnogKHSmJsOMamuT9RhM5Y5VHm5iJQxAgAvQwmC7PpljWMHS6SSgjqTmi5oCjfsKxJc34N_3seMG6Ivyc4XGJjSlHrGnL1nk94YiRsM8S"
  },
  {
    name: "Acid Wash Jogger",
    category: "bottom",
    colors: ["Grey", "Acid Lime"],
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=200"
  },
  {
    name: "Cyber Kicks V.2",
    category: "shoes",
    colors: ["Neon Magenta", "Black"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDnaxS-_nnB9ghKAMa47xRR4yKpxJQ6PnoHmFanSYK8wEwKijM1e0PGrYqnlORzbmB9rJ_I1mr6-JNGjVAkhXQOF_1m-dGHlBf4ZMxsnPJMzphKNGitf6b3Z4cAbYlqKSzz2SfjzqtxL3joj2d3vdTSzpxS7yudWQIm_yVChdrlXe1OhwFOJehiVnO3fIjVP-J5wFTbBE9UCH_Oy2Hl5jlAqqhSOUM8CQU94qzAW6g7ze1Ki-iWMzIv6jcmjfebUE9C9pFOrWNjwRP"
  },
  {
    name: "Platform Moon Boots",
    category: "shoes",
    colors: ["Cyber White", "Holo"],
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvyelT9tIk7N4n16vewsNvVOj7LwqlQxv6VOuvGqb0FylmjTzaUuoKPmRCvmpaviFzyLEXkQi3Ibb75LA6dKDQ2q5AzRjCy7k2WjxSeJCY7_zoeZadvxyvAOqxGiHpP0OX-1m8tss6iMiMwD5AHXrI8lOBugWNfmCGoN0QcK8A2jh4_AwZe4af7hGr1eicr0QmQJdOg7c_6LN4uxcBmRwaKoKJIWGtTKfLNhrM3psCvxB3A15V09JfdpbSfcxX8aeXfgyf0X9Nrt6w"
  },
  {
    name: "Hacker Shades.exe",
    category: "accessories",
    colors: ["Black", "Neon Cyan"],
    imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=200"
  },
  {
    name: "Chlowing Choker",
    category: "accessories",
    colors: ["Heart Pink", "Leather"],
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=200"
  }
];

export const STATIC_STICKERS = [
  { id: "s1", icon: "💊", name: "Cyber Pill" },
  { id: "s2", icon: "💖", name: "8-Bit Heart" },
  { id: "s3", icon: "⭐", name: "Glitch Star" },
  { id: "s4", icon: "🎮", name: "Retro Controller" },
  { id: "s5", icon: "👾", name: "Alien Invader" },
  { id: "s6", icon: "🎀", name: "Cute Ribbon" },
  { id: "s7", icon: "⚡", name: "Volt Lightning" },
  { id: "s8", icon: "🛸", name: "Neon UFO" }
];
