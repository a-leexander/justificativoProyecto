//Invocamos express (server)
const express = require("express");
const app = express();

//seteamos urlencoded para capturar datos de formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

//invocamos dotenv
const  dotenv = require("dotenv");
dotenv.config({path:"./env/.env"});

//seteamos el directorio public
app.use("/resources", express.static("public"));
app.use("/resources", express.static(__dirname + "/public"));
// console.log(__dirname)

//establecemos el motor de plantillas 
app.set("view engine", "ejs");

// Var de session
const session = require("express-session");
app.use (session({
    secret: "secret",
    resave: true,
    saveUninitialized:true
}));

//conexion a base de datos
const conexion = require("./database/db")
// multer para los archivos pdf
const multer = require("multer");
const path = require("path");

const upload = multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten archivos PDF"));
        }
    }
});

//Creacion del edpoint para recibir solo una url (una imagen)
app.post("/enviar-justificativo", upload.single("certificado"), (req, res) => {

    // Datos del formulario
    console.log(req.body);

    // Archivo PDF
    console.log(req.file);

    
    if (!req.file) {
        return res.send("No se subió ningún PDF");
    }

    res.send("Formulario y PDF recibidos correctamente");
});

app.listen(3000, function(){
    console.log("Servidor creado http://localhost:3200");
});

//Rutas 
app.get("/", (req, res)=>{
    res.render("index");
});







