const mongoose = require("mongoose");
//Estrutura do documento
const Schema = mongoose.Schema;

let postSchema = new Schema(
  {
    titulo: String,
    img: String,
    categoria: String,
    conteudo: String,
    slug: String,
    autor: String,
    views: Number,
  },
  { collection: "posts" }
);

let Posts = mongoose.model("Posts", postSchema);
module.exports = Posts;
