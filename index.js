const FILESYSTEM = require("fs"),
  PATH = require("path");

let generate = (content = {}) => {
  console.log("ping");
  // GET DATA
  //      index
  //      toc
  //      chapters
  //      cover
  //      cover is a buffer or a filepath?
  //      package
  // KEEP EACH FILES IN BUFFER OR FILESYS
  // ZIP IT OUT
  //      and keep in buffer
  //      adjust filename
  //      return epub buffer
};

exports.generate = generate;
