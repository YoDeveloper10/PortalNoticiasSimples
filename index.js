/*Para instalar o mongoDb npm install mongoose*/
const mongoose = require("mongoose");

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const fs = require("fs");

//Cria a aplicação
const app = express();

//Conexão com banco de dados
const Posts = require("./Posts.js");

mongoose
  .connect(
    "mongodb+srv://admin:admin123@cluster0.nlecdfo.mongodb.net/portalNoticias?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Conectado com sucesso"))
  .catch((err) => console.log(err.message));
//File Upload
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "temp"),
  })
);

//Receita de bolo para utilizar Express JS

//Para funcionar com formulário precisa desse código!
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//Para funcionar a session
app.use(
  session({
    secret: "keyboard cat",
    cookie: { maxAge: 60000 },
  })
);

//Renderiza tipo html, utilizando o ejs
app.engine("html", require("ejs").renderFile);

//Diz que a view engine é html
app.set("view engine", "html");

//Diretório statico
app.use("/public", express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "/pages"));

//Rota da home
app.get("/", (req, res) => {
  //2 opções
  //Não está pesquisando nada ou está buscando alguma coisa

  //O req.query resgata na url
  //localhost:3000?busca=esportes
  //Ele vai resgatar um objeto {busca: 'esportes'}
  if (req.query.search == null) {
    //Requisição posts
    //Pega tudo, organiza de forma decrescente e executa
    Posts.find({})
      .sort({ _id: -1 })
      .exec()
      .then((posts) => {
        posts = posts.map((val) => {
          return {
            titulo: val.titulo,
            conteudo: val.conteudo,
            descricaoCurta: val.conteudo.substr(0, 100),
            img: val.img,
            slug: val.slug,
            categoria: val.categoria.toUpperCase(),
            autor: val.autor,
          };
        });

        Posts.find({})
          .sort({ views: -1 })
          .limit(3)
          .exec()
          .then((postsTop) => {
            postsTop = postsTop.map(function (val) {
              return {
                titulo: val.titulo,

                conteudo: val.conteudo,

                descricaoCurta: val.conteudo.substr(0, 100),

                img: val.img,

                slug: val.slug,

                categoria: val.categoria.toUpperCase(),

                views: val.views,
              };
            });

            res.render("Home", { posts: posts, postsTop: postsTop });
          })
          .catch((err) => console.log(err.message));
      })
      .catch((err) => console.log(err.message));
    //Renderiza pagina
  } else {
    // res.send(`Você buscou: ${req.query.search}`);
    Posts.find({ titulo: { $regex: req.query.search, $options: "i" } })
      .then((posts) => {
        posts = posts.map((val) => {
          return {
            titulo: val.titulo,
            conteudo: val.conteudo,
            descricaoCurta: val.conteudo.substr(0, 250),
            img: val.img,
            slug: val.slug,
            categoria: val.categoria.toUpperCase(),
            autor: val.autor,
          };
        });
        res.render("busca", {
          posts: posts,
          contagem: posts.length,
          search: req.query.search,
        });
      })
      .catch((err) => res.redirect("/"));
  }
});

//Slug -> url amigável
//Slug é basicamente a url que vai ser pesquisada após o barra
//Ex: localhost:3000/url-do-slug
app.get("/:slug", (req, res) => {
  //res.send(req.params.slug)
  //Query para achar a noticia escolhida, atuaaliza o post e recupera ele

  //Acha um e atualiza ele, logo acha com base no slug e atualiza as views
  Posts.findOneAndUpdate(
    { slug: req.params.slug },
    { $inc: { views: 1 } },
    { new: true }
  )
    .then((noticia) => {
      if (!noticia) {
        // Se a notícia não for encontrada, renderize uma página de erro ou redirecione para algum lugar apropriado
        // Você pode criar uma página not-found.html
        res.redirect("/");
      } else {
        // Se a notícia for encontrada, renderize a página single.html com a notícia
        Posts.find({})
          .sort({ views: -1 })
          .limit(3)
          .exec()
          .then((postsTop) => {
            postsTop = postsTop.map(function (val) {
              return {
                titulo: val.titulo,

                conteudo: val.conteudo,

                descricaoCurta: val.conteudo.substr(0, 100),

                img: val.img,

                slug: val.slug,

                categoria: val.categoria.toUpperCase(),

                views: val.views,
              };
            });

            res.render("single", { noticia: noticia, postsTop: postsTop });
          })
          .catch((err) => console.log(err.message));
      }
    })
    .catch((err) => console.log(err.message));
});

//Login com session
let users = [{ email: "yan@gmail.com", password: "123456" }];

app.post("/admin/login", (req, res) => {
  users.map(({ email, password }) => {
    if (email == req.body.email && req.body.password == password) {
      req.session.login = "Admin";
    } else {
      console.log("Usuário ou senha não batem!");
    }
  });
  res.redirect("/admin/login");
});

app.get("/admin/login", (req, res) => {
  if (req.session.login == null) {
    res.render("admin-login");
  } else {
    Posts.find({})
      .sort({ titulo: 1 })
      .exec()
      .then((posts) => {
        posts = posts.map(function (val) {
          return {
            id: val._id,

            titulo: val.titulo,

            conteudo: val.conteudo,

            descricaoCurta: val.conteudo.substr(0, 100),

            img: val.img,

            slug: val.slug,

            categoria: val.categoria.toUpperCase(),

            views: val.views,
          };
        });

        res.render("admin-painel", {
          login: req.session.login,
          posts: posts,
          message: false,
        });
      })
      .catch((err) => console.log(err.message));
  }
});

//cadastro de noticias
app.post("/admin/cadastrar", async (req, res) => {
  if (req.session.login == null) {
    res.redirect("/admin/login");
  } else {
    let message = "";

    if (req.body && Object.keys(req.body).length === 0) {
      // Nenhum dado de formulário foi enviado
      res.status(400).send("Envie o formulário primeiro!");
    } else {
      //Inserindo noticia no mongodbb

      let format = req.files.file.name.split(".");
      let img = "";
      let type = format[format.length - 1];
      if (type == "jpg" || type == "png" || type == "jpeg") {
        img = new Date().getTime() + ".jpg";
        req.files.file.mv(__dirname + "/public/images/" + img);
      } else {
        fs.unlinkSync(req.files.file.tempFilePath);
      }

      //Upload de arquivos
      Posts.create({
        titulo: req.body.title,
        img: "http://localhost:5000/public/images/" + img,
        categoria: req.body.category,
        conteudo: req.body.content,
        slug: req.body.slug,
        autor: req.body.author,
        views: 0,
      });
      message = "Formulário enviado com sucesso!";
      Posts.find({})
        .sort({ titulo: 1 })
        .exec()
        .then((posts) => {
          posts = posts.map(function (val) {
            return {
              id: val._id,

              titulo: val.titulo,

              conteudo: val.conteudo,

              descricaoCurta: val.conteudo.substr(0, 100),

              img: val.img,

              slug: val.slug,

              categoria: val.categoria.toUpperCase(),

              views: val.views,
            };
          });

          res.render("admin-painel", {
            login: req.session.login,
            posts: posts,
            message: message,
          });
        })
        .catch((err) => console.log(err.message));
    }
  }
});
//deletando noticia
app.get("/admin/deletar/:id", (req, res) => {
  Posts.deleteOne({ _id: req.params.id }).then(() => {
    res.redirect("/admin/login");
  });
});

app.listen(3000, () => console.log("server rodando!"));
