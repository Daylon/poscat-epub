const FILESYSTEM = require('fs'),
	PATH = require('path'),
	HANDLEBARS = require('handlebars')

const PATH_BOOK = PATH.join('.', 'book', 'EPUB'),
	PAGE_TYPES = ['index', 'toc', 'package'],
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
			FS.readFile(filePath, (err, template) => {
				console.log('> PRETEMPLATING', err)
				if (err) reject(err)
				else resolve(template)
			})
		}

	return new Promise(getTemplateFile)
}

let createAllTemplates = (resolve, reject) => {
	let promises = []
	for (let page in PAGES) {
		page.promise = createTemplate(page.name)
		page.promise
			.then((template) => {
				page.template = template
			})
			.catch((err) => {
				console.log('> ERROR in PRETEMPLATING', error)
			})
		promises.push(page.promise)
	}

	Promise.all(promises)
		.then(resolve(PAGES))
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

// 2. Copy static assets

let copyStaticAssets = () => {}

// 3. Create archive

// PUBLIC FUNCTIONS

let generate = (epubModel = {}, archiveAsBuffer = true) => {
	let pDynamicAssets = null,
		pCopiedAssets = null,
		compileTemplates = () => {
			// singleton pages:
			PAGE_TYPES.forEach((pageName) => {
				PAGES[pageName].compiled = HANDLEBARS.compile(PAGES[pageName].template)(
					epubModel
				)
			})
			// chapters
			epubModel.content.forEach((chapter) => {
				let { data, title } = chapter
				PAGES.chapters.content.push({
					title,
					data: HANDLEBARS.compile(data),
				})
			})
			// cover
			PAGES.cover.buffer = readCover(epubModel.cover)
		}

	pDynamicAssets = new Promise(createAllTemplates)
	pDynamicAssets.then(compileTemplates)

	pCopiedAssets = new Promise(copyStaticAssets)
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
}

exports.generate = generate
