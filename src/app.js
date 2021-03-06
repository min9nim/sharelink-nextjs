import { observable, reaction, decorate } from 'mobx'
import $m from '../com/util'
import getApi from './restful'
import getAuth from './auth'
import base64js from 'base64-js'

//console.log("process.env.PORT : " + process.env.PORT);
//console.log("location.hostname : " + location.hostname);

let BACKEND
//console.log("process.env.GOOGLE_CLOUD_PROJECT = " + process.env.GOOGLE_CLOUD_PROJECT)
console.log('process.env.NODE_ENV = [' + process.env.NODE_ENV + ']')

if (process.env.NODE_ENV === 'production') {
  BACKEND = 'https://sharelink-api.now.sh'
} else {
  BACKEND = 'http://localhost:3030'
}

console.log('Backend server : ' + BACKEND)

const app = {
  $m, // 기본 유틸
  scrollTop: 0, // 목록화면에서 현재 스크롤 위치
  state: {
    links: [],
    totalCount: 0,
    userID: '',
    menuIdx: 0,
    isScrollLast: false,
    word: '', // 검색어
    menu: [
      {
        label: '전체 포스트',
        path: '/',
      },
      {
        label: '내가 등록한 포스트',
        path: '/my',
      },
      {
        label: '내가 좋아하는 포스트',
        path: '/like',
      },
      {
        label: '내가 읽은 포스트',
        path: '/read',
      },
      {
        label: '나중에 읽을 포스트',
        path: '/toread',
      },
    ],
  },
  user: {
    id: '',
    name: '',
    email: '',
    image: '',
    token: '',
  },
  view: {}, // 공유가 필요한 react 컴포넌트
  BACKEND,
  PAGEROWS: 10,
}

app.api = getApi(app)
app.auth = getAuth(app)

decorate(app, { state: observable })

// 변화에 따른 효과를 정의
reaction(
  () => JSON.stringify(app.state.links),
  () => {
    app.view.List && app.view.List._ismounted && app.view.List.forceUpdate()
  },
)

reaction(
  () => JSON.stringify(app.state.word),
  () => {
    app.view.Search &&
      app.view.Search._ismounted &&
      app.view.Search.forceUpdate()
  },
)

reaction(
  () => app.state.userID,
  async () => {
    // app.state.userID 값을 바라보며 앱의 로그인 여부를 판단한다.
    if (app.auth.isLogin()) {
      // console.log("로그인 상태")
    } else {
      // document.cookie = "user="
      // global.sessionStorage.setItem("user", "");
      // app.user = {
      //     id: "",
      //     name: "",
      //     email: "",
      //     image: "",
      //     token: ""
      // };
      if (app.router && app.router.pathname.indexOf('/write') === 0) {
        //app.router.push("/login");
        location.href = '/login'
      }

      // console.log("로그아웃 됨")
    }

    app.view.Header &&
      app.view.Header._ismounted &&
      app.view.Header.forceUpdate()
    app.view.List && app.view.List._ismounted && app.view.List.forceUpdate()
  },
)

app.isDesktop = function() {
  const os = ['win16', 'win32', 'win64', 'mac', 'macintel']
  return (
    global.navigator && os.includes(global.navigator.platform.toLowerCase())
  )
}

app.isMobileChrome = function() {
  return (
    !app.isDesktop() &&
    global.navigator &&
    global.navigator.userAgent.includes('Chrome')
  )
}

app.Base64Encode = (str, encoding = 'utf-8') => {
  var bytes = new (TextEncoder || TextEncoderLite)(encoding).encode(str)
  return base64js.fromByteArray(bytes)
}

app.Base64Decode = (str, encoding = 'utf-8') => {
  var bytes = base64js.toByteArray(str)
  return new (TextDecoder || TextDecoderLite)(encoding).decode(bytes)
}

app.getUser = async req => {
  try {
    let userStr
    if (req) {
      userStr = Buffer.from(req.cookies.user || '', 'base64').toString('utf8')
    } else {
      userStr = global.sessionStorage.getItem('user')
    }

    //console.log("userStr = " + userStr);

    if (userStr) {
      let user = JSON.parse(userStr)

      app.user.token = user.token
      $m.timelog.start('로그인 체크')
      let res = await app.api.login()
      $m.timelog.check('로그인 체크 완료')
      if (res.status === 'Fail') {
        console.log(`[getInitialProps] 로그인 실패 : ${res.message}`)
        return {}
      } else {
        return user
      }
      // if (isExpired(user.exp * 1000)){
      //     console.log("[getInitialProps] 로그인 실패 : Token is expired")
      //     return {};
      // } else {
      //     //console.log("[getInitialProps] 로그인 성공")
      //     return user;
      // }
    } else {
      console.log('[getInitialProps] 로그인 실패 : user 정보 없음')
      return {}
    }
  } catch (e) {
    //console.error(e);
    console.log(e.message)
    return {}
  }
}

global.app = app
export default app
