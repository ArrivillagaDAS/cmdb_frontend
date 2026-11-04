import { config } from "./config.js";

const posterPaths = {
  Interstellar: "gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "The Dark Knight": "qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "Spirited Away": "39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  "Blade Runner 2049": "gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  "Pulp Fiction": "d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  "The Shining": "9fgh3Ns1iRzlQNYuJyK0ARQZU7w.jpg",
  "Spider-Man: Un nuevo universo": "8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  "Your Name.": "q719jXXEzOoYaps6babgKnONONX.jpg",
  "Toy Story": "uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
  Akira: "neZ0ykEsPqxamsX6o5QNUFILQrz.jpg",
  Hereditary: "4GFPuL14eXi66V96xBWY73Y9PfR.jpg",
  "The Grand Budapest Hotel": "eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
  "The Batman": "74xTEgt7R36Fpooo50r9T25onhq.jpg",
  Coco: "gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
  "Mad Max: Furia en la carretera": "8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
};

export function posterUrl(movie, size = config.tmdbPosterSize) {
  if (movie?.image_url) return movie.image_url;
  const path = posterPaths[movie?.movie_name];
  return path ? `${config.tmdbImageBaseUrl}/${size}/${path}` : "";
}
