const express = require("express");
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

const app = express();

app.use(express.urlencoded({extended:false}));
app.use(express.json());

app.use("/resources", express.static("public"));
app.use("/resources", express.static(__dirname + "/public"));

app.set("view engine", "ejs");

app.get("/", (req, res)=>{
    res.render("index");
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