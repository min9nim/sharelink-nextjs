import Layout from '../comps/Layout.js'
import { withRouter } from 'next/router'
import app from '../src/app'
import { observable, reaction, decorate } from 'mobx'
import shortid from 'shortid'
import $m from '../com/util.js'
import './write.scss'
import { _findLink } from '../com/pure.js'

class Write extends React.Component {
  constructor(props) {
    super(props)

    app.state.userID = props.user.id
    app.user = props.user

    let link = this.props.link
    link = Object.assign({}, link) // 복사본을 전달

    this.state = link.id
      ? link
      : {
          id: '',
          url: '',
          title: '',
          desc: '',
          image: '',
          like: [],
          read: [],
          toread: [],
          author: {
            id: app.user.id,
            name: app.user.name,
          },
        }

    app.view.Write = this

    // mobx 설정
    decorate(this, { state: observable })
    reaction(
      () => JSON.stringify(this.state),
      () => {
        this.forceUpdate()
      },
    )
  }

  static async getInitialProps({ req, asPath, query }) {
    let user = await app.getUser(req)
    app.user.token = user.token

    let link
    if (req) {
      let fetchRes = await app.api.fetchLink(req.query.id)
      link = fetchRes[0]
    } else {
      //link = app.state.links.find(l => l.id === query.id);
      link = _findLink(app.state.links, query.id)
    }

    return {
      menuIdx: 0,
      link,
      user,
    }
  }

  cancel() {
    this.props.router.push('/')
  }

  componentWillUnmount() {
    this._ismounted = false
  }

  async save() {
    if (!this.state.url) {
      alert('링크를 입력해 주세요')
      this.urlInput.focus()
      return
    }
    if (!this.state.title) {
      alert('제목을 입력해 주세요')
      this.titleInput.focus()
      return
    }

    // 인증을 위한 토큰 전달
    this.state.token = app.user.token

    function avoidXSS(link) {
      return Object.assign({}, link, {
        url: $m.removeTag(link.url),
        // title: $m.removeTag(link.title),
        // desc: $m.removeTag(link.desc),
        /**
         * 18.11.19
         * title과 desc 에서는 tag 를 사용할 수 있도록 허용한다.
         * 대신에 내용을 보여줄 때 html 태그를 인코딩하여 처리한다.
         */
        title: link.title,
        desc: link.desc,
        image: $m.removeTag(link.image),
      })
    }

    if (this.state.id) {
      // 수정할 때
      await app.api.putLink(avoidXSS(this.state))
    } else {
      // 신규등록
      let newLink = Object.assign({}, this.state, { id: shortid.generate() })
      await app.api.postLink(avoidXSS(newLink))
    }

    this.props.router.push('/')
  }

  componentDidMount() {
    this._ismounted = true

    if (this.state.url === '') {
      this.urlInput.focus()
    }

    if (!app.auth.isLogin()) {
      alert('글등록은 로그인이 필요합니다')
      //this.props.router.push("/login");
      location.href = '/login'
    }
  }

  handleChange(e) {
    this.state[e.target.id] = e.target.value
  }

  async handleBlur() {
    const { url, title, desc, image } = this.state

    if (url === '') return
    if (title && desc && image) return

    const loadingMessage = 'Loading..'

    // this.state.title = loadingMessage;
    // this.state.desc = loadingMessage;
    // this.state.image = loadingMessage;

    this.titleInput.setAttribute('placeholder', loadingMessage)
    this.descInput.setAttribute('placeholder', loadingMessage)
    this.imageInput.setAttribute('placeholder', loadingMessage)

    try {
      const { title, image, desc } = await fetch(
        'https://webscrap.now.sh/webscrap',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: this.state.url,
          }),
        },
      ).then(res => res.json())

      // let { title, image, desc } = await app.api.webscrap(this.state.url);

      // 타이틀 세팅
      if (this.state.title === '') {
        this.state.title = title
      }

      // 설명세팅
      if (this.state.desc === '') {
        this.state.desc = desc
      }

      //이미지 세팅
      this.state.image = image

      // if (image && image.indexOf("http") === 0) {
      //   // http 로 시작하면 그냥 사용
      //   this.state.image = image;
      // } else {
      //   let url = new URL(this.state.url);
      //   this.state.image = url.protocol + "//" + url.hostname + image;
      //   //console.log(this.state.image);
      // }

      if (this.state.title === '') {
        this.titleInput.setAttribute(
          'placeholder',
          '글 제목을 가져올 수 없습니다',
        )
      }
      if (this.state.desc === '') {
        this.descInput.setAttribute(
          'placeholder',
          '글 설명을 가져올 수 없습니다',
        )
      }
      if (this.state.image === '') {
        this.imageInput.setAttribute('placeholder', '대표 이미지가 없습니다')
      }
    } catch (e) {
      console.error(e.message)
    }
  }

  enterSave(e) {
    if (e.key === 'Enter') {
      this.save()
    }
  }

  enterCancel(e) {
    if (e.key === 'Enter') {
      this.cancel()
    }
  }

  initValue(e) {
    this.state[e.target.parentNode.previousSibling.id] = ''
    e.target.parentNode.previousSibling.focus()
  }

  render() {
    return (
      <Layout>
        <div className="write-title">
          {this.state.id ? '내용 수정' : '링크 등록'}
        </div>
        <div className="wrapper">
          <div className="form">
            <div>
              <div className="label">글주소</div>
              <input
                placeholder="http://"
                id="url"
                ref={el => {
                  this.urlInput = el
                }}
                value={this.state.url}
                onChange={this.handleChange.bind(this)}
                onBlur={this.handleBlur.bind(this)}
              />
              <div className="init-btn">
                <i
                  className="icon-cancel"
                  onClick={this.initValue.bind(this)}
                />
              </div>
            </div>
            <div>
              <div className="label">글제목</div>
              <input
                placeholder=""
                id="title"
                ref={el => {
                  this.titleInput = el
                }}
                value={this.state.title}
                onChange={this.handleChange.bind(this)}
              />
              <div className="init-btn">
                <i
                  className="icon-cancel"
                  onClick={this.initValue.bind(this)}
                />
              </div>
            </div>
            <div>
              <div className="label">간단 설명(선택)</div>
              <input
                placeholder=""
                id="desc"
                ref={el => {
                  this.descInput = el
                }}
                value={this.state.desc}
                onChange={this.handleChange.bind(this)}
              />
              <div className="init-btn">
                <i
                  className="icon-cancel"
                  onClick={this.initValue.bind(this)}
                />
              </div>
            </div>
            <div>
              <div className="label">대표 이미지 경로</div>
              <input
                placeholder=""
                id="image"
                ref={el => {
                  this.imageInput = el
                }}
                value={this.state.image}
                onChange={this.handleChange.bind(this)}
              />
              <div className="init-btn">
                <i
                  className="icon-cancel"
                  onClick={this.initValue.bind(this)}
                />
              </div>
            </div>
          </div>
          <div className="image">
            <img src={this.state.image}></img>
          </div>
        </div>

        <div className="btn">
          <div
            onClick={this.save.bind(this)}
            tabIndex="0"
            onKeyPress={this.enterSave.bind(this)}
          >
            <i className="icon-floppy" /> 저장
          </div>
          <div
            onClick={this.cancel.bind(this)}
            tabIndex="0"
            onKeyPress={this.enterCancel.bind(this)}
          >
            <i className="icon-cancel" /> 취소
          </div>
        </div>
      </Layout>
    )
  }
}

export default withRouter(Write)
