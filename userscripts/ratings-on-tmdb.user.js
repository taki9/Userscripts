// ==UserScript==
// @name               Ratings on TMDb
// @name:de            Bewertungen auf TMDb
// @name:es            Calificaciones en TMDb
// @name:fr            Notes sur TMDb
// @name:it            Valutazioni su TMDb
// @name:ru            Рейтинги на TMDb
// @name:zh-CN         TMDb 上的评分
// @author             Davide <iFelix18@protonmail.com>
// @namespace          https://github.com/iFelix18
// @icon               https://www.google.com/s2/favicons?sz=64&domain=themoviedb.org
// @description        Adds ratings from IMDb, Rotten Tomatoes and Metacritic to TMDb
// @description:de     Fügt Bewertungen von IMDb, Rotten Tomatoes und Metacritic zu TMDb hinzu
// @description:es     Agrega calificaciones de IMDb, Rotten Tomatoes y Metacritic a TMDb
// @description:fr     Ajoute des notes d'IMDb, Rotten Tomatoes et Metacritic à TMDb
// @description:it     Aggiunge valutazioni da IMDb, Rotten Tomatoes e Metacritic a TMDb
// @description:ru     Добавляет рейтинги IMDb, Rotten Tomatoes и Metacritic в TMDb
// @description:zh-CN  将 IMDb、Rotten Tomatoes 和 Metacritic 的评分添加到 TMDb
// @copyright          2021, Davide (https://github.com/iFelix18)
// @license            MIT
// @version            1.0.0
// @homepage           https://github.com/iFelix18/Userscripts#readme
// @homepageURL        https://github.com/iFelix18/Userscripts#readme
// @supportURL         https://github.com/iFelix18/Userscripts/issues
// @updateURL          https://raw.githubusercontent.com/iFelix18/Userscripts/master/userscripts/meta/ratings-on-tmdb.meta.js
// @downloadURL        https://raw.githubusercontent.com/iFelix18/Userscripts/master/userscripts/ratings-on-tmdb.user.js
// @require            https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.min.js
// @require            https://cdn.jsdelivr.net/gh/iFelix18/Userscripts@abce8796cedbe28ac8e072d9824c4b9342985098/lib/utils/utils.min.js
// @require            https://cdn.jsdelivr.net/gh/iFelix18/Userscripts@bced30119a3304aff1c4f71c77bd1781cefde396/lib/api/omdb.min.js
// @require            https://cdn.jsdelivr.net/gh/iFelix18/Userscripts@8c5a008457b859c22300b94b416767b8d2605bb2/lib/api/tmdb.min.js
// @require            https://cdn.jsdelivr.net/npm/gm4-polyfill@1.0.1/gm4-polyfill.min.js#sha256-qmLl2Ly0/+2K+HHP76Ul+Wpy1Z41iKtzptPD1Nt8gSk=
// @require            https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js#sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=
// @require            https://cdn.jsdelivr.net/npm/handlebars@4.7.7/dist/handlebars.min.js#sha256-ZSnrWNaPzGe8v25yP0S6YaMaDLMTDHC+4mHTw0xydEk=
// @match              *://www.themoviedb.org/movie/*
// @match              *://www.themoviedb.org/tv/*
// @exclude-match      *://www.themoviedb.org/*/titles
// @exclude-match      *://www.themoviedb.org/*/cast
// @exclude-match      *://www.themoviedb.org/*/episode_groups
// @exclude-match      *://www.themoviedb.org/*/season*
// @exclude-match      *://www.themoviedb.org/*/releases
// @exclude-match      *://www.themoviedb.org/*/translations
// @exclude-match      *://www.themoviedb.org/*/watch
// @exclude-match      *://www.themoviedb.org/*/changes
// @exclude-match      *://www.themoviedb.org/*/edit
// @exclude-match      *://www.themoviedb.org/*/images*
// @exclude-match      *://www.themoviedb.org/*/videos
// @exclude-match      *://www.themoviedb.org/*/discuss*
// @exclude-match      *://www.themoviedb.org/*/reviews
// @connect            omdbapi.com
// @connect            api.themoviedb.org
// @grant              GM.deleteValue
// @grant              GM.getValue
// @grant              GM.info
// @grant              GM.listValues
// @grant              GM.registerMenuCommand
// @grant              GM.setValue
// @grant              GM.xmlHttpRequest
// @grant              GM_deleteValue
// @grant              GM_getValue
// @grant              GM_info
// @grant              GM_listValues
// @grant              GM_registerMenuCommand
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// @run-at             document-start
// @inject-into        page
// ==/UserScript==

/* global $, GM_config, Handlebars, MonkeyUtils, OMDb, TMDb */

(() => {
  'use strict'

  //* GM_config
  GM_config.init({
    id: 'ratings-config',
    title: `${GM.info.script.name} v${GM.info.script.version} Settings`,
    fields: {
      TMDbApiKey: {
        label: 'TMDb API Key',
        section: ['Enter your TMDb API Key', 'Get one at: https://developers.themoviedb.org/3/'],
        type: 'text',
        title: 'Your TMDb API Key',
        size: 70,
        default: ''
      },
      OMDbApiKey: {
        label: 'OMDb API Key',
        section: ['You can request a free OMDb API Key at:', 'https://www.omdbapi.com/apikey.aspx'],
        type: 'text',
        title: 'Your OMDb API Key',
        size: 70,
        default: ''
      },
      logging: {
        label: 'Logging',
        section: ['Develop'],
        labelPos: 'right',
        type: 'checkbox',
        default: false
      },
      debugging: {
        label: 'Debugging',
        labelPos: 'right',
        type: 'checkbox',
        default: false
      },
      clearCache: {
        label: 'Clear the cache',
        type: 'button',
        click: async () => {
          const values = await GM.listValues()

          values.forEach(async (value) => {
            const cache = await GM.getValue(value) // get cache
            if (cache.time) { GM.deleteValue(value) } // delete cache
          })

          MU.log('cache cleared')
          GM_config.close()
        }
      }
    },
    /* cspell: disable-next-line */
    css: '#ratings-config{background-color:#343434;color:#fff}#ratings-config *{font-family:varela round,helvetica neue,Helvetica,Arial,sans-serif}#ratings-config .section_header{background-color:#282828;border:1px solid #282828;border-bottom:none;color:#fff;font-size:10pt}#ratings-config .section_desc{background-color:#282828;border:1px solid #282828;border-top:none;color:#fff;font-size:10pt}#ratings-config #ratings-config_field_magic{margin:0 auto;display:block}#ratings-config .reset{color:#fff}',
    events: {
      init: () => {
        if (!GM_config.isOpen && (GM_config.get('TMDbApiKey') === '' | GM_config.get('OMDbApiKey') === '')) {
          window.onload = () => GM_config.open()
        }
      },
      save: () => {
        if (!GM_config.isOpen && (GM_config.get('TMDbApiKey') === '' | GM_config.get('OMDbApiKey') === '')) {
          window.alert(`${GM.info.script.name}: check your settings and save`)
        } else {
          window.alert(`${GM.info.script.name}: settings saved`)
          GM_config.close()
          window.location.reload(false)
        }
      }
    }
  })
  GM.registerMenuCommand('Configure', () => GM_config.open())

  //* MonkeyUtils
  const MU = new MonkeyUtils({
    name: GM.info.script.name,
    version: GM.info.script.version,
    author: GM.info.script.author,
    color: '#ff0000',
    logging: GM_config.get('logging')
  })
  MU.init('ratings-config')

  //* TMDb API
  const tmdb = new TMDb({
    apikey: GM_config.get('TMDbApiKey'),
    debug: GM_config.get('debugging')
  })

  //* OMDb API
  const omdb = new OMDb({
    apikey: GM_config.get('OMDbApiKey'),
    debug: GM_config.get('debugging')
  })

  //* Handlebars
  Handlebars.registerHelper('ifEqual', function (a, b, options) {
    if (a === b) return options.fn(this)
    return options.inverse(this)
  })

  //* Constants
  const cachePeriod = 3600000 // 1 hours
  const logos = {
    imdb: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTI4IDEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByeD0iOCIgZmlsbD0iI2Y1YzUxOCIvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDIsMCwwLDIsMTYsNDYpIj48cG9seWdvbiBwb2ludHM9IjAgMCAwIDE4IDUgMTggNSAwIi8+PHBhdGggZD0iTSAxNS42NzI1MTgsMCAxNC41NTM0ODMsOC40MDg0NjkzIDEzLjg1ODIwMSwzLjgzNTAyNDMgQyAxMy42NTY2MSwyLjM3MDA5MjYgMTMuNDYzMjQ3LDEuMDkxNzUxMiAxMy4yNzgxMTMsMCBIIDcgdiAxOCBoIDQuMjQxNjM1IEwgMTEuMjU4MDkxLDYuMTEzODA2OCAxMy4wNDM2MDksMTggaCAzLjAxOTc0OCBMIDE3Ljc1ODM2NSw1Ljg1MTc4NjUgMTcuNzcwNzA4LDE4IEggMjIgViAwIFoiLz48cGF0aCBkPSJtMjQgMTh2LTE4aDcuODA0NTU5YzEuNzY0NzkzIDAgMy4xOTU0NDEgMS40MTk5NDQxIDMuMTk1NDQxIDMuMTc2NjA0MnYxMS42NDY3OTE4YzAgMS43NTQzOS0xLjQyODMzOCAzLjE3NjYwNC0zLjE5NTQ0MSAzLjE3NjYwNHptNS44MzIyNDgtMTQuNzYwNDc2NGMtMC4xOTgzMjYtMC4xMDcxOTAxLTAuNTc3NzMyLTAuMTU4ODAwMi0xLjEyOTU5Ni0wLjE1ODgwMDJ2MTEuODEwNzYyNmMwLjcyODYzMyAwIDEuMTc3MDIyLTAuMTMxMDEgMS4zNDUxNjctMC40MDQ5NCAwLjE2ODE0Ni0wLjI2OTk2IDAuMjU0Mzc1LTEuMDAwNDQxIDAuMjU0Mzc1LTIuMTk5Mzgydi02Ljk3OTI2ODFjMC0wLjgxMzg1MDktMC4wMzAxOC0xLjMzMzkyMTUtMC4wODYyMy0xLjU2NDE4MTctMC4wNTYwNS0wLjIzMDI2MDMtMC4xODEwOC0wLjM5NzAwMDUtMC4zODM3MTctMC41MDQxOTA2eiIvPjxwYXRoIGQ9Im00NC40Mjk5MDggNC41MDY4NTgyaDAuMzE5NjFjMS43OTUxOTIgMCAzLjI1MDQ4MiAxLjQwNTgxNzcgMy4yNTA0ODIgMy4xMzgwMDk0djcuMjE3MTIzNGMwIDEuNzMzMDc0LTEuNDU0ODE4IDMuMTM4MDA5LTMuMjUwNDgyIDMuMTM4MDA5aC0wLjMxOTYxYy0xLjA5ODQ0NiAwLTIuMDY5NjMzLTAuNTI2MzM4LTIuNjU4MDM4LTEuMzMxNzI2bC0wLjI4Nzk3NCAxLjEwMDUwNGgtNC40ODM4OTZ2LTE3Ljc2ODc3OGg0Ljc4NDMyNnY1Ljc4MDUzNTZjMC42MTgxNzItMC43NzAzNzgyIDEuNTcwODI1LTEuMjczNjc3NCAyLjY0NTU4Mi0xLjI3MzY3NzR6bS0xLjAyNDM0IDguNzc3MzU3OHYtNC4yNjUxMzc5YzAtMC43MDQ3Mzg2LTAuMDQ1MjQtMS4xNjcyMjM0LTAuMTM5NDkzLTEuMzgwMTEzMy0wLjA5NDI1LTAuMjEyODg5OC0wLjQ3MDQ4Ny0wLjM0OTU3MzItMC43MzQzOTMtMC4zNDk1NzMycy0wLjY3MDg4OSAwLjExMTA4MjItMC43NTAwNiAwLjI5ODI3ODR2Ny4yMTk4MDljMC4wOTA0OCAwLjIwNTU0OSAwLjQ3ODYxNCAwLjMxOTkyNyAwLjc1MDA2IDAuMzE5OTI3czAuNjY2NTMxLTAuMTEwNzA4IDAuNzQ5NDczLTAuMzE5OTI3YzAuMDgyOTQtMC4yMDkyMiAwLjEyNDQxMy0wLjcxOTQyMSAwLjEyNDQxMy0xLjUyMzI2M3oiLz48L2c+PC9zdmc+',
    metacritic: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAyOS40IDI5LjciIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDI5LjQgMjkuNzsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkNDMzQ7fQoJLnN0MXtmaWxsOiMzMzMzMzM7fQoJLnN0MntmaWxsOiNGRUZFRkU7fQoJLnN0M3tmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8dGl0bGU+UGFnZSAxPC90aXRsZT4KPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CjxnPgoJPHBhdGggaWQ9IkZpbGwtMSIgY2xhc3M9InN0MCIgZD0iTTI5LjQsMTQuOGMwLDguMi02LjcsMTQuOS0xNC45LDE0LjlTLTAuMywyMy0wLjMsMTQuOEMtMC4zLDYuNyw2LjMsMCwxNC41LDBTMjkuNCw2LjcsMjkuNCwxNC44IgoJCS8+Cgk8cGF0aCBpZD0iRmlsbC00IiBjbGFzcz0ic3QxIiBkPSJNMjYuNSwxNC44YzAsNi42LTUuMywxMS45LTExLjksMTEuOVMyLjcsMjEuNCwyLjcsMTQuOFM4LDIuOSwxNC42LDIuOQoJCUMyMS4xLDIuOSwyNi41LDguMiwyNi41LDE0LjgiLz4KCTxwYXRoIGlkPSJGaWxsLTYiIGNsYXNzPSJzdDIiIGQ9Ik02LjgsMTguOWMtMS0xLTEuOS0xLjktMi43LTIuNmwyLjItMi4ybDEuMiwxTDcuNiwxNWMtMC4yLTAuOC0wLjMtMi4zLDEuMS0zLjcKCQljMS4xLTEuMSwyLjUtMS40LDMuNy0wLjhsMCwwYy0wLjEtMC44LTAuMS0xLjUsMC4xLTIuMWMwLjItMC43LDAuNi0xLjQsMS4yLTJjMS42LTEuNiwzLjktMS43LDYuNCwwLjhsNC45LDQuOWwtMi41LDIuNUwxOCwxMC4xCgkJYy0xLjItMS4yLTIuMy0xLjUtMy4xLTAuN2MtMC42LDAuNi0wLjYsMS40LTAuMywyLjFjMC4xLDAuMiwwLjQsMC41LDAuNiwwLjdsNC45LDQuOWwtMi41LDIuNUwxMywxNWMtMS0xLTIuMS0xLjQtMy0wLjUKCQljLTAuNywwLjctMC41LDEuNi0wLjMsMi4xYzAuMSwwLjMsMC4zLDAuNSwwLjYsMC44bDQuOCw0LjhsLTIuNSwyLjVMNi44LDE4Ljl6Ii8+CjwvZz4KPGc+Cgk8cGF0aCBpZD0iRmlsbC04IiBjbGFzcz0ic3QzIiBkPSJNMzQuOCwxMy4yYzAtMS4zLDAtMi41LTAuMS0zLjRoMi44bDAuMSwxLjVoMC4xYzAuNS0wLjcsMS40LTEuNywzLjItMS43YzEuNCwwLDIuNSwwLjcsMi45LDEuOAoJCWwwLDBjMC40LTAuNiwwLjktMSwxLjQtMS4zYzAuNi0wLjMsMS4zLTAuNSwyLTAuNWMyLjEsMCwzLjYsMS40LDMuNiw0Ljd2Ni4zaC0zLjJ2LTUuOWMwLTEuNi0wLjUtMi41LTEuNi0yLjUKCQljLTAuOCwwLTEuMywwLjUtMS42LDEuMmMtMC4xLDAuMi0wLjEsMC42LTAuMSwwLjh2Ni4zaC0zLjJ2LTZjMC0xLjMtMC41LTIuMy0xLjYtMi4zYy0wLjksMC0xLjQsMC43LTEuNiwxLjIKCQljLTAuMSwwLjMtMC4xLDAuNi0wLjEsMC45djYuMmgtMy4ydi03LjNIMzQuOHoiLz4KCTxwYXRoIGlkPSJGaWxsLTEwIiBjbGFzcz0ic3QzIiBkPSJNNjAuMiwxMy45YzAtMC44LTAuNC0yLjItMS45LTIuMmMtMS40LDAtMiwxLjMtMi4xLDIuMkg2MC4yeiBNNTYuMywxNi4yYzAuMSwxLjQsMS41LDIuMSwzLDIuMQoJCWMxLjEsMCwyLjEtMC4yLDMtMC41bDAuNCwyLjNjLTEuMSwwLjUtMi40LDAuNy0zLjksMC43Yy0zLjYsMC01LjctMi4xLTUuNy01LjVjMC0yLjcsMS43LTUuNyw1LjQtNS43YzMuNSwwLDQuOCwyLjcsNC44LDUuNAoJCWMwLDAuNi0wLjEsMS4xLTAuMSwxLjNMNTYuMywxNi4yeiIvPgoJPHBhdGggaWQ9IkZpbGwtMTIiIGNsYXNzPSJzdDMiIGQ9Ik02OSw2Ljl2Mi45aDIuNHYyLjVINjl2My45YzAsMS4zLDAuMywxLjksMS4zLDEuOWMwLjUsMCwwLjcsMCwxLTAuMXYyLjUKCQljLTAuNCwwLjItMS4yLDAuMy0yLjIsMC4zYy0xLjEsMC0yLTAuNC0yLjUtMC45Yy0wLjYtMC43LTAuOS0xLjctMC45LTMuMnYtNC40aC0xLjRWOS44aDEuNHYtMkw2OSw2Ljl6Ii8+Cgk8cGF0aCBpZD0iRmlsbC0xNCIgY2xhc3M9InN0MyIgZD0iTTc5LDE1LjVjLTEuOCwwLTMuMSwwLjQtMy4xLDEuN2MwLDAuOSwwLjYsMS4zLDEuMywxLjNjMC44LDAsMS41LTAuNSwxLjctMS4yCgkJYzAtMC4yLDAuMS0wLjQsMC4xLTAuNlYxNS41eiBNODIuMywxOGMwLDEsMCwyLDAuMiwyLjZoLTNsLTAuMi0xLjFoLTAuMWMtMC43LDAuOS0xLjgsMS4zLTMuMSwxLjNjLTIuMiwwLTMuNS0xLjYtMy41LTMuMwoJCWMwLTIuOCwyLjUtNC4xLDYuMy00LjF2LTAuMWMwLTAuNi0wLjMtMS40LTItMS40Yy0xLjEsMC0yLjMsMC40LTMsMC44bC0wLjYtMi4xYzAuNy0wLjQsMi4yLTEsNC4yLTFjMy42LDAsNC43LDIuMSw0LjcsNC42CgkJTDgyLjMsMThMODIuMywxOHoiLz4KCTxwYXRoIGlkPSJGaWxsLTE2IiBjbGFzcz0ic3QzIiBkPSJNOTMsMjAuM2MtMC42LDAuMy0xLjcsMC41LTMsMC41Yy0zLjUsMC01LjctMi4xLTUuNy01LjVjMC0zLjEsMi4yLTUuNyw2LjEtNS43CgkJYzAuOSwwLDEuOCwwLjIsMi41LDAuNGwtMC41LDIuNWMtMC40LTAuMi0xLTAuMy0xLjktMC4zYy0xLjgsMC0yLjksMS4zLTIuOSwzYzAsMiwxLjMsMywyLjksM2MwLjgsMCwxLjQtMC4xLDEuOS0wLjRMOTMsMjAuM3oiLz4KCTxwYXRoIGlkPSJGaWxsLTE4IiBjbGFzcz0ic3QzIiBkPSJNOTQuOCwxMy4zYzAtMS42LDAtMi42LTAuMS0zLjVoMi45bDAuMSwyaDAuMWMwLjUtMS42LDEuOC0yLjIsMi45LTIuMmMwLjMsMCwwLjUsMCwwLjcsMC4xdjMuMQoJCWMtMC4zLDAtMC41LTAuMS0wLjktMC4xYy0xLjIsMC0yLjEsMC42LTIuMywxLjdjMCwwLjItMC4xLDAuNS0wLjEsMC43djUuNGgtMy4zQzk0LjgsMjAuNSw5NC44LDEzLjMsOTQuOCwxMy4zeiIvPgoJPHBhdGggaWQ9IkZpbGwtMjAiIGNsYXNzPSJzdDMiIGQ9Ik0xMDMuMSwyMC41aDMuM1Y5LjhoLTMuM1YyMC41eiBNMTA0LjgsOC40Yy0xLjEsMC0xLjgtMC44LTEuOC0xLjhzMC43LTEuOCwxLjktMS44CgkJYzEuMSwwLDEuOCwwLjgsMS45LDEuOEMxMDYuNyw3LjYsMTA1LjksOC40LDEwNC44LDguNEwxMDQuOCw4LjR6Ii8+Cgk8cGF0aCBpZD0iRmlsbC0yMiIgY2xhc3M9InN0MyIgZD0iTTExMi45LDYuOXYyLjloMi40djIuNWgtMi40djMuOWMwLDEuMywwLjMsMS45LDEuMywxLjljMC41LDAsMC43LDAsMS0wLjF2Mi41CgkJYy0wLjQsMC4yLTEuMiwwLjMtMi4yLDAuM2MtMS4xLDAtMi0wLjQtMi41LTAuOWMtMC42LTAuNi0wLjktMS43LTAuOS0zLjJ2LTQuNGgtMS40VjkuOGgxLjR2LTJMMTEyLjksNi45eiIvPgoJPHBhdGggaWQ9IkZpbGwtMjMiIGNsYXNzPSJzdDMiIGQ9Ik0xMTcuMiwyMC41aDMuM1Y5LjhoLTMuM1YyMC41eiBNMTE4LjgsOC40Yy0xLjEsMC0xLjgtMC44LTEuOC0xLjhzMC43LTEuOCwxLjktMS44CgkJYzEuMSwwLDEuOCwwLjgsMS45LDEuOEMxMjAuNyw3LjYsMTIwLDguNCwxMTguOCw4LjRMMTE4LjgsOC40eiIvPgoJPHBhdGggaWQ9IkZpbGwtMjQiIGNsYXNzPSJzdDMiIGQ9Ik0xMzEuMiwyMC4zYy0wLjYsMC4zLTEuNywwLjUtMywwLjVjLTMuNSwwLTUuNy0yLjEtNS43LTUuNWMwLTMuMSwyLjItNS43LDYuMS01LjcKCQljMC45LDAsMS44LDAuMiwyLjUsMC40bC0wLjUsMi41Yy0wLjQtMC4yLTEtMC4zLTEuOS0wLjNjLTEuOCwwLTIuOSwxLjMtMi45LDNjMCwyLDEuMywzLDIuOSwzYzAuOCwwLDEuNC0wLjEsMS45LTAuNEwxMzEuMiwyMC4zeiIKCQkvPgo8L2c+Cjwvc3ZnPgo=',
    rotten: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDU5LjEgKDg2MTQ0KSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT4KICAgIDx0aXRsZT5JY29ucy9Ub21hdG9tZXRlciAmYW1wOyBBUy9yb3R0ZW48L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZGVmcz4KICAgICAgICA8cG9seWdvbiBpZD0icGF0aC0xIiBwb2ludHM9IjAgMC4xNjE5NTA0NjUgNzkuNzQxNzA3NSAwLjE2MTk1MDQ2NSA3OS43NDE3MDc1IDc3LjUyMjgwNyAwIDc3LjUyMjgwNyI+PC9wb2x5Z29uPgogICAgPC9kZWZzPgogICAgPGcgaWQ9Ikljb25zL1RvbWF0b21ldGVyLSZhbXA7LUFTL3JvdHRlbiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9Ikdyb3VwLTUiPgogICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHkiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9IjAiIHg9IjAiIHk9IjAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PC9yZWN0PgogICAgICAgICAgICA8ZyBpZD0iUlRfUm90dGVuX1NwbGF0X1JHQi0oMSkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuMDAwMDAwLCAxLjIyODA3MCkiPgogICAgICAgICAgICAgICAgPGcgaWQ9Ikdyb3VwLTMiPgogICAgICAgICAgICAgICAgICAgIDxtYXNrIGlkPSJtYXNrLTIiIGZpbGw9IndoaXRlIj4KICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjcGF0aC0xIj48L3VzZT4KICAgICAgICAgICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9IkNsaXAtMiI+PC9nPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik03MS40NjM4NTk2LDcwLjIyNTYxNCBDNTYuMzQ1OTY0OSw3MS4wMTkyOTgyIDUzLjI1Njg0MjEsNTMuNzIwMzUwOSA0Ny4zMjU2MTQsNTMuODQzNTA4OCBDNDQuNzk4MjQ1Niw1My44OTY0OTEyIDQyLjgwNjMxNTgsNTYuNTM4OTQ3NCA0My42ODEwNTI2LDU5LjYxODU5NjUgQzQ0LjE2MjEwNTMsNjEuMzExNTc4OSA0NS40OTY0OTEyLDYzLjc5NDM4NiA0Ni4zMzcxOTMsNjUuMzM1MDg3NyBDNDkuMzAyODA3LDcwLjc3MTkyOTggNDQuOTE4NTk2NSw3Ni45MjQ1NjE0IDM5Ljc4ODA3MDIsNzcuNDQ0OTEyMyBDMzEuMjYyMTA1Myw3OC4zMDk4MjQ2IDI3LjcwNTYxNCw3My4zNjM4NTk2IDI3LjkyNTYxNCw2OC4zMDA3MDE4IEMyOC4xNzI5ODI1LDYyLjYxNjg0MjEgMzIuOTkyMjgwNyw1Ni44MDkxMjI4IDI4LjA0OTQ3MzcsNTQuMzM3ODk0NyBDMjIuODY5NDczNyw1MS43NDgwNzAyIDE4LjY1ODU5NjUsNjEuODc1NDM4NiAxMy43MDE3NTQ0LDY0LjEzNTc4OTUgQzkuMjE1NDM4Niw2Ni4xODE3NTQ0IDIuOTg3NzE5Myw2NC41OTU0Mzg2IDAuNzczNjg0MjExLDU5LjYxMzY4NDIgQy0wLjc4MTQwMzUwOSw1Ni4xMTI5ODI1IC0wLjQ5ODU5NjQ5MSw0OS4zNzIyODA3IDYuNDI1MjYzMTYsNDYuODAwMzUwOSBDMTAuNzUwMTc1NCw0NS4xOTQwMzUxIDIwLjM4ODA3MDIsNDguOTAxMDUyNiAyMC44ODI0NTYxLDQ0LjIwNTYxNCBDMjEuNDUyMjgwNywzOC43OTI5ODI1IDEwLjc1NzU0MzksMzguMzM2NDkxMiA3LjUzNzU0Mzg2LDM3LjAzODU5NjUgQzEuODQsMzQuNzQyNDU2MSAtMS41MjI4MDcwMiwyOS44MjkxMjI4IDEuMTExOTI5ODIsMjQuNTU4MjQ1NiBDMy4wODg3NzE5MywyMC42MDQ1NjE0IDguOTA1MjYzMTYsMTguOTk1Nzg5NSAxMy4zNDQ5MTIzLDIwLjcyNzcxOTMgQzE4LjY2MzUwODgsMjIuODAyNDU2MSAxOS41MTcxOTMsMjguMzE4OTQ3NCAyMi4yNDIxMDUzLDMwLjYxMjk4MjUgQzI0LjU4OTQ3MzcsMzIuNTkwMTc1NCAyNy44MDIxMDUzLDMyLjgzNzU0MzkgMjkuOTAzMTU3OSwzMS40NzgyNDU2IEMzMS40NTI2MzE2LDMwLjQ3NTQzODYgMzEuOTY4NDIxMSwyOC4yNzI5ODI1IDMxLjM4Mzg1OTYsMjYuMjYxMDUyNiBDMzAuNjA4NDIxMSwyMy41OTAxNzU0IDI4LjU1MDUyNjMsMjEuOTIzNTA4OCAyNi41NDI4MDcsMjAuMjkwNTI2MyBDMjIuOTY5ODI0NiwxNy4zODU5NjQ5IDE3LjkyNTYxNCwxNC44ODg0MjExIDIwLjk3Njg0MjEsNi45NjAzNTA4OCBDMjMuNDc3ODk0NywwLjQ2MzE1Nzg5NSAzMC44MTMzMzMzLDAuMjI5MTIyODA3IDMwLjgxMzMzMzMsMC4yMjkxMjI4MDcgQzMzLjcyNzcxOTMsLTAuMDk4NTk2NDkxMiAzNi4zMzc1NDM5LDAuNzgxNDAzNTA5IDM4LjQ2NDIxMDUsMi42ODE0MDM1MSBDNDEuMzA3MzY4NCw1LjIyMTQwMzUxIDQxLjg2MTA1MjYsOC42MTY0OTEyMyA0MS4zODUyNjMyLDEyLjIzODU5NjUgQzQwLjk1MDUyNjMsMTUuNTQ0OTEyMyAzOS43ODAzNTA5LDE4LjQ0MDcwMTggMzkuMTcwMTc1NCwyMS43MTY0OTEyIEMzOC40NjIxMDUzLDI1LjUxOTY0OTEgNDAuNDk0NzM2OCwyOS4zNTE5Mjk4IDQ0LjM2MDM1MDksMjkuNTAxMDUyNiBDNDkuNDQ0OTEyMywyOS42OTc1NDM5IDUwLjk2OTQ3MzcsMjUuNzg5NDczNyA1MS41OTE1Nzg5LDIzLjMxMjI4MDcgQzUyLjUwMjQ1NjEsMTkuNjg3NzE5MyA1My42OTc4OTQ3LDE2LjMyMjgwNyA1Ny4wNjE3NTQ0LDE0LjIwMzUwODggQzYxLjg4OTQ3MzcsMTEuMTYxNzU0NCA2OC41OTU0Mzg2LDExLjgyODQyMTEgNzEuNzA2NjY2NywxNy42NzQzODYgQzc0LjE2NzcxOTMsMjIuMyA3My4zNzc1NDM5LDI4LjY2NzcxOTMgNjkuNjAyNDU2MSwzMi4xNDQ5MTIzIEM2Ny45MDg3NzE5LDMzLjcwNDU2MTQgNjUuODcyMjgwNywzNC4yNTQzODYgNjMuNjY5NDczNywzNC4yNjk4MjQ2IEM2MC41MTA1MjYzLDM0LjI5MjI4MDcgNTcuMzUyOTgyNSwzNC4yMTQ3MzY4IDU0LjQyMDcwMTgsMzUuNjkyOTgyNSBDNTIuNDI0NTYxNCwzNi42OTg5NDc0IDUxLjU1NDczNjgsMzguMzM4MjQ1NiA1MS41NTUwODc3LDQwLjUzNTQzODYgQzUxLjU1NTA4NzcsNDIuNjc2ODQyMSA1Mi42Njk4MjQ2LDQ0LjA3NTQzODYgNTQuNDc2MTQwNCw0NC45ODU2MTQgQzU3Ljg3ODI0NTYsNDYuNzAwMzUwOSA2MS42MzM2ODQyLDQ3LjA1MDg3NzIgNjUuMzA4NzcxOSw0Ny42OTQzODYgQzcwLjYzODI0NTYsNDguNjI3NzE5MyA3NS4zMjQyMTA1LDUwLjUwNDkxMjMgNzguMzMyNjMxNiw1NS40NTA1MjYzIEM3OC4zNTk2NDkxLDU1LjQ5NDAzNTEgNzguMzg1OTY0OSw1NS41Mzc4OTQ3IDc4LjQxMTU3ODksNTUuNTgyMTA1MyBDODEuODY2NjY2Nyw2MS40Mzc1NDM5IDc4LjI1MzMzMzMsNjkuODY4NzcxOSA3MS40NjM4NTk2LDcwLjIyNTYxNCIgaWQ9IkZpbGwtMSIgZmlsbD0iIzBBQzg1NSIgbWFzaz0idXJsKCNtYXNrLTIpIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg==',
    fresh: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDU5LjEgKDg2MTQ0KSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT4KICAgIDx0aXRsZT5JY29ucy9Ub21hdG9tZXRlciAmYW1wOyBBUy9mcmVzaDwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxkZWZzPgogICAgICAgIDxwb2x5Z29uIGlkPSJwYXRoLTEiIHBvaW50cz0iMC4wMDAxMDkxMDAxMDIgMC4yNDY5NzA5NTQgNzcuMDgyNzgzNyAwLjI0Njk3MDk1NCA3Ny4wODI3ODM3IDYzLjcxNDUyMjggMC4wMDAxMDkxMDAxMDIgNjMuNzE0NTIyOCI+PC9wb2x5Z29uPgogICAgPC9kZWZzPgogICAgPGcgaWQ9Ikljb25zL1RvbWF0b21ldGVyLSZhbXA7LUFTL2ZyZXNoIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iR3JvdXAiPgogICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlLUNvcHktMiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMCIgeD0iMCIgeT0iMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIj48L3JlY3Q+CiAgICAgICAgICAgIDxnIGlkPSJSVF9GcmVzaF9Ub21hdG9fUkdCLSgxKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMS4zMjc4MDEsIDAuMDAwMDAwKSI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iR3JvdXAtMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDE2LjI2NTU2MCkiPgogICAgICAgICAgICAgICAgICAgIDxtYXNrIGlkPSJtYXNrLTIiIGZpbGw9IndoaXRlIj4KICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjcGF0aC0xIj48L3VzZT4KICAgICAgICAgICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9IkNsaXAtMiI+PC9nPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik03Ny4wMTM3NzU5LDI3LjA0MjY1NTYgQzc2LjI0MjMyMzcsMTQuNjc0MTkwOSA2OS45NTIxOTkyLDUuNDIwNDE0OTQgNjAuNDg3NjM0OSwwLjI0Njk3MDk1NCBDNjAuNTQxNDEwOCwwLjU0ODM4MTc0MyA2MC4yNzMxOTUsMC45MjUxNDUyMjggNTkuOTY3ODAwOCwwLjc5MTcwMTI0NSBDNTMuNzc3MjYxNCwtMS45MTYzNDg1NSA0My4yNzUzNTI3LDYuODQ3ODAwODMgMzUuOTM2NTk3NSwyLjI1ODI1NzI2IEMzNS45OTE3MDEyLDMuOTA1Mzk0MTkgMzUuNjcwMDQxNSwxMS45NDAyNDkgMjQuMzUxNTM1MywxMi40MDYzMDcxIEMyNC4wODQzMTU0LDEyLjQxNzI2MTQgMjMuOTM3MjYxNCwxMi4xNDQzOTgzIDI0LjEwNjIyNDEsMTEuOTUxMjAzMyBDMjUuNjE5OTE3LDEwLjIyNDczMDMgMjcuMTQ4MjE1OCw1Ljg1MzYwOTk2IDI0Ljk1MDcwNTQsMy41MjMzMTk1IEMyMC4yNDQ2NDczLDcuNzQwNDE0OTQgMTcuNTExNzAxMiw5LjMyNzQ2ODg4IDguNDg4Mjk4NzYsNy4yMzMxOTUwMiBDMi43MTEwMzczNCwxMy4yNzQwMjQ5IC0wLjU2MjY1NTYwMiwyMS41NDE5MDg3IDAuMDgsMzEuODQxMzI3OCBDMS4zOTEyMDMzMiw1Mi44NjYzOSAyMS4wODQ4MTMzLDY0Ljg4NDY0NzMgNDAuOTE2NTE0NSw2My42NDcxMzY5IEM2MC43NDY4ODgsNjIuNDEwNjIyNCA3OC4zMjUzMTEyLDQ4LjA2NzcxNzggNzcuMDEzNzc1OSwyNy4wNDI2NTU2IiBpZD0iRmlsbC0xIiBmaWxsPSIjRkEzMjBBIiBtYXNrPSJ1cmwoI21hc2stMikiPjwvcGF0aD4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik00MC44NzE3MDEyLDExLjQ2NDg5NjMgQzQ0Ljk0NjcyMiwxMC40OTM2MSA1Ni42Njc4ODM4LDExLjM3MDI5MDUgNjAuNDIzMjM2NSwxNi4zNTE4NjcyIEM2MC42NDg2MzA3LDE2LjY1MDYyMjQgNjAuMzMxMjg2MywxNy4yMTU5MzM2IDU5Ljk2NzgwMDgsMTcuMDU3MjYxNCBDNTMuNzc3MjYxNCwxNC4zNDkyMTE2IDQzLjI3NTM1MjcsMjMuMTEzMzYxIDM1LjkzNjU5NzUsMTguNTIzODE3NCBDMzUuOTkxNzAxMiwyMC4xNzA5NTQ0IDM1LjY3MDA0MTUsMjguMjA1ODA5MSAyNC4zNTE1MzUzLDI4LjY3MTg2NzIgQzI0LjA4NDMxNTQsMjguNjgyODIxNiAyMy45MzcyNjE0LDI4LjQwOTk1ODUgMjQuMTA2MjI0MSwyOC4yMTY3NjM1IEMyNS42MTk5MTcsMjYuNDkwMjkwNSAyNy4xNDc4ODM4LDIyLjExOTE3MDEgMjQuOTUwNzA1NCwxOS43ODg4Nzk3IEMxOS44MjQzOTgzLDI0LjM4MjczODYgMTcuMDQ1MzExMiwyNS44NTg5MjEyIDUuOTE5MDA0MTUsMjIuODUxNDUyMyBDNS41NTQ4NTQ3NywyMi43NTMxOTUgNS42NzkwMDQxNSwyMi4xNjc5NjY4IDYuMDY2MzkwMDQsMjIuMDIwMjQ5IEM4LjE2OTI5NDYxLDIxLjIxNjU5NzUgMTIuOTMzNDQ0LDE3LjY5NjU5NzUgMTcuNDQwNjYzOSwxNi4xNDUwNjIyIEMxOC4yOTg3NTUyLDE1Ljg0OTk1ODUgMTkuMTU0MTkwOSwxNS42MjA5MTI5IDE5Ljk4OTA0NTYsMTUuNDg3ODAwOCBDMTUuMDI2MzksMTUuMDQ0MzE1NCAxMi43ODkzNzc2LDE0LjM1NDE5MDkgOS42MzI4NjMwNywxNC44MzAyMDc1IEM5LjI4Njk3MDk1LDE0Ljg4MjMyMzcgOS4wNTE5NTAyMSwxNC40Nzk2NjggOS4yNjYzOTAwNCwxNC4yMDM0ODU1IEMxMy41MTkzMzYxLDguNzI1MzExMiAyMS4zNTQwMjQ5LDcuMDcwODcxMzcgMjYuMTg3ODgzOCw5Ljk4MTA3ODg0IEMyMy4yMDgyOTg4LDYuMjg5MTI4NjMgMjAuODc0MzU2OCwzLjM0NDczMDI5IDIwLjg3NDM1NjgsMy4zNDQ3MzAyOSBMMjYuNDA0NjQ3MywwLjIwMzQ4NTQ3NyBDMjYuNDA0NjQ3MywwLjIwMzQ4NTQ3NyAyOC42ODk0NjA2LDUuMzA4MjE1NzcgMzAuMzUxODY3Miw5LjAyMzQwMjQ5IEMzNC40NjU3MjYxLDIuOTQ1MDYyMjQgNDIuMTE5ODM0LDIuMzg0MDY2MzkgNDUuMzUzNjkyOSw2LjY5Njc2MzQ5IEM0NS41NDU1NjAyLDYuOTUzMDI5MDUgNDUuMzQ1MDYyMiw3LjMxNzUxMDM3IDQ1LjAyNDczMDMsNy4zMDk4NzU1MiBDNDIuMzkyNjk3MSw3LjI0NTgwOTEzIDQwLjk0MzQwMjUsOS42Mzk4MzQwMiA0MC44MzM1MjcsMTEuNDYwNTgwOSBMNDAuODcxNzAxMiwxMS40NjQ4OTYzIiBpZD0iRmlsbC00IiBmaWxsPSIjMDA5MTJEIj48L3BhdGg+CiAgICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg=='
  }

  //* Functions
  /**
   * Returns ratings from OMDb
   * @param {*} id IMDb ID
   * @returns {Promise}
   */
  const getRatings = async (id) => {
    const cache = await GM.getValue(id) // get cache

    return new Promise((resolve, reject) => {
      if (cache !== undefined && ((Date.now() - cache.time) < cachePeriod)) { // cache valid
        MU.log(`${id} data from cache`)
        resolve(elaborateResponse(cache.response))
      } else { // cache not valid
        omdb.get({
          id: id
        }).then((response) => {
          GM.setValue(id, { response, time: Date.now() }) // set cache
          MU.log(`${id} data from OMDb`)
          resolve(elaborateResponse(response))
        })
      }
    }).catch((error) => MU.error(error))
  }

  /**
   * Returns elaborated response
   * @param {Object} response
   * @returns {Object}
   */
  const elaborateResponse = (response) => {
    return ([
      {
        logo: logos.imdb,
        rating: response.imdbRating,
        source: 'imdb',
        symbol: '/10',
        votes: response.imdbVotes !== 'N/A' ? parseFloat(response.imdbVotes.replace(/,/g, '')) >= 1000 ? `${Math.round(parseFloat(response.imdbVotes.replace(/,/g, '')) / 1000, 1)}k` : `${parseFloat(response.imdbVotes.replace(/,/g, ''))}` : 'N/A'
      },
      {
        logo: response.Ratings[1] !== undefined && response.Ratings[1].Source === 'Rotten Tomatoes' ? parseFloat(response.Ratings[1].Value) < 60 ? logos.rotten : logos.fresh : logos.fresh,
        rating: response.Ratings[1] !== undefined && response.Ratings[1].Source === 'Rotten Tomatoes' ? response.Ratings[1].Value.replace(/%/g, '') : 'N/A',
        source: 'tomatoes',
        symbol: '%',
        votes: response.Ratings[1] !== undefined && response.Ratings[1].Source === 'Rotten Tomatoes' ? parseFloat(response.Ratings[1].Value) < 60 ? 'Rotten' : 'Fresh' : 'N/A'
      },
      {
        logo: logos.metacritic,
        rating: response.Metascore,
        source: 'metascore',
        symbol: '',
        votes: response.Metascore !== 'N/A' ? response.Metascore < 40 ? '#ff0000' : response.Metascore >= 40 && response.Metascore <= 60 ? '#ffcc33' : '#66cc33' : 'N/A'
      }
    ])
  }

  /**
   * Add template
   */
  const addTemplate = () => {
    const template = '<li class=external-ratings style=display:flex;margin-right:0></li><script id=external-ratings-template type=text/x-handlebars-template>{{#each ratings}}<div class="{{this.source}}-rating" style="display: inline-flex; align-items: center; margin-right: 20px;"> <div class="logo" style="display: inline-flex;"> <img src="{{this.logo}}" alt="logo" width="46"> </div><div class="text" style="font-weight: 700; margin-left: 6px; display: inline-flex; flex-direction: column; align-items: flex-start;"> <div class="vote" style="display: flex; align-items: center; align-content: center; justify-content: center;">{{this.rating}}{{#ifEqual this.rating "N/A"}}{{else}}<span style="font-weight: 400; font-size: 80%; opacity: 0.8;">{{this.symbol}}</span>{{/ifEqual}}</div>{{#ifEqual this.votes "N/A"}}{{else}}{{#ifEqual this.source "metascore"}}<div class="votes" style="display: flex; align-items: center; align-content: center; justify-content: center; background: linear-gradient(to top, transparent 0, transparent 25%,{{this.votes}} 25%,{{this.votes}} 75%, transparent 75%, transparent 100%); color:transparent;">{{this.rating}}</div>{{else}}<div class="votes" style="font-weight: 400; opacity: 0.8;">{{this.votes}}</div>{{/ifEqual}}{{/ifEqual}}</div></div>{{/each}}</script>'
    const target = 'section.inner_content section.header ul.actions li.chart'

    $(template).insertAfter(target)
  }

  /**
   * Clear old data from the cache
   */
  const clearOldCache = async () => {
    const values = await GM.listValues()

    values.forEach(async (value) => {
      const cache = await GM.getValue(value) // get cache
      if ((Date.now() - cache.time) > cachePeriod) { GM.deleteValue(value) } // delete old cache
    })
  }

  //* Script
  $(document).ready(() => {
    clearOldCache()

    const regex = /(?<=(movie|tv)\/)(.*?)(?=-)/g.exec(window.location.pathname)
    const id = regex[0]
    const type = regex[1]

    tmdb.externalIDs(type, id).then((response) => {
      const id = response.imdb_id
      if (!id) return

      MU.log(`ID is '${id}'`)

      addTemplate()
      getRatings(id).then((response) => {
        MU.log(response)

        const template = Handlebars.compile($('#external-ratings-template').html())
        const context = { ratings: response }
        const compile = template(context)
        $('.external-ratings').html(compile)
      }).catch((error) => MU.error(error))
    }).catch((error) => MU.error(error))
  })
})()