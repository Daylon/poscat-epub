const FS = require('fs'),
	PATH = require('path'),
	HANDLEBARS = require('handlebars'),
	ARCHIVER = require('archiver'),
	PARSE_ARGUMENTS = require('./lib/parse-arguments')

const ARGUMENTS = PARSE_ARGUMENTS.infer(process.argv),
	OUTPUT_FOLDER = 'build',
	PATH_BOOK = PATH.join('.', 'book', 'EPUB'),
	PATH_EPUB_FULL = PATH.join('.', 'build'),
	PAGE_TYPES = ['index', 'toc', 'package', 'cover'], // cover refers as both html and png/svg
	CHAPTER_KEY = 'chapters',
	COVER_KEY = 'cover',
	PAGES = {
		index: {
			name: 'index.html',
		},
		toc: {
			name: 'toc.html',
		},
		chapters: {
			name: 'chapter.html',
		},
		cover: {
			name: 'cover.html',
		},
		package: {
			name: 'package.opf',
		},
	},
	ASSETS_FOLDER = ['css', 'fonts']

// 1. strings retrieval and compilation

let getPathFor = (file) => PATH.join(`${PATH_BOOK}`, `${file}`)

let createTemplate = (filename = '') => {
	let filePath = getPathFor(filename),
		getTemplateFile = (resolve, reject) => {
			FS.readFile(filePath, 'utf8', (err, template) => {
				console.log('> PRETEMPLATING err? ', err)
				if (err !== null) reject(err)
				else resolve(template)
			})
		}

	return new Promise(getTemplateFile)
}

let createAllTemplates = (resolve, reject) => {
	let promises = [],
		page = {}
	for (let pageName in PAGES) {
		page = PAGES[pageName]
		page.promise = createTemplate(page.name)
		page.promise
			.then((template) => {
				console.log('> finishing preparation')
				PAGES[pageName].template = Buffer.from(template || '').toString('utf8')
			})
			.catch((err) => {
				console.log('> ERROR in PRETEMPLATING', error)
			})
		promises.push(page.promise)
	}

	Promise.all(promises)
		.then((response) => {
			resolve(PAGES)
		})
		.catch((err) => reject(err))
}

let readCover = (coverPath) => {
	let readCoverFn = (resolve, reject) => {
		FS.readFile(coverPath, (err, coverFileBuffer) => {
			console.log('> COVER RETRIEVAL', err)
			if (err) reject(err)
			else resolve(coverFileBuffer)
		})
	}
	return new Promise(readCoverFn)
}

// 2. Create archive

let buildArchive = () => {
	const EPUB = archiver('zip', {
			zlib: { level: 9 }, // Sets the compression level.
		}),
		OUTPUT = null
	let buildArchiveFn = (resolve, reject) => {
		// 3.a set archive up
		OUTPUT = FS.createWriteStream(PATH_EPUB_FULL)
		// listen for all archive data to be written
		// 'close' event is fired only when a file descriptor is involved
		OUTPUT.on('close', function () {
			console.log(archive.pointer() + ' total bytes')
			console.log(
				'archiver has been finalized and the output file descriptor has closed.'
			)
			resolve(EPUB)
		})
		// This event is fired when the data source is drained no matter what was the data source.
		// It is not part of this library but rather from the NodeJS Stream API.
		// @see: https://nodejs.org/api/stream.html#stream_event_end
		OUTPUT.on('end', function () {
			console.log('Data has been drained')
		})
		// good practice to catch warnings (ie stat failures and other non-blocking errors)
		EPUB.on('warning', function (err) {
			if (err.code === 'ENOENT') {
				// log warning
			} else {
				// throw error
				throw err
			}
		})
		// good practice to catch this error explicitly
		EPUB.on('error', function (err) {
			throw err
		})
		// pipe archive data to the file
		EPUB.pipe(OUTPUT)

		// 3.b ADDING CONTENT
		// + specialized pags
		PAGE_TYPES.forEach((pageName) => {
			let { compiled, name } = PAGES[pageName]
			EPUB.append(compiled, { name: `EPUB/${name}.html` })
		})
		// + chapters
		PAGES.chapters.forEach((chapter, index) => {
			let { title, compiled } = chapter
			EPUB.append(compiled, { name: `EPUB/chapter-${index}.html` })
		})
		// + adding buffered files (cover, fonts, etc.)
		EPUB.append(PAGES.cover.buffer, { name: `EPUB/images/cover` })
		EPUB.directory('css/', 'css')
		EPUB.directory('fonts/', 'fonts')
		EPUB.finalize()
	}
	return new Promise(buildArchiveFn)
}

// PUBLIC FUNCTIONS

let generate = (epubModel = {}, archiveAsBuffer = false) => {
	let { filename } = epubModel,
		pDynamicAssets = null,
		pArchivedAssets = null,
		compileTemplates = () => {
			// singleton pages:
			PAGE_TYPES.forEach((pageName) => {
				PAGES[pageName].compiled = HANDLEBARS.compile(PAGES[pageName].template)(
					epubModel
				)
			})
			// chapters
			if (Array.isArray(epubModel.content) === true) {
				epubModel.content.forEach((chapter) => {
					let { data, title } = chapter
					PAGES.chapters.content.push({
						title,
						compiled: HANDLEBARS.compile(data),
					})
				})
			}
			// cover
			PAGES.cover.buffer = readCover(epubModel.cover)
		},
		generateFn = (resolve, reject) => {
			pDynamicAssets = new Promise(createAllTemplates)
			pDynamicAssets.then(compileTemplates).then(() => {
				pArchivedAssets = new Promise(buildArchive)
			})
			Promise.all([pDynamicAssets, pArchivedAssets]).then(resolve).catch(reject)
		}

	//pCopiedAssets = new Promise(copyStaticAssets)
	/*
  content should include:
    publisher: 'poscat',
    lang: 'FR',
    author,
    title,
    cover: IMAGERY.pathToCover(work, 'png'),
    tocTitle: workdata.title.toUpperCase() || 'Sommaire',
    appendChapterTitles: false,
    content: retrofitFragments(content),
    output: paths.epub
  */
	// MAKE TEMPLATES
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
	return new Promise(generateFn)
}

if (ARGUMENTS.write) generate({})

exports.generate = generate
