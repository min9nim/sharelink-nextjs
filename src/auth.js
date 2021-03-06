import { isExpired } from "../com/pure";


export default function getAuth(app) {
    return {// 로그인 관련
        init: () => {
            if (global.location && !global.GoogleAuth && app.router.asPath !== "/login") {
                gapi.load('client', {
                    callback: function () {
                        // console.log("gapi.client loaded")
                        if (gapi.auth2.getAuthInstance() === null) {
                            // 구글 로그인 초기화
                            gapi.client.init({
                                'apiKey': 'sharelink',
                                'clientId': '314955303656-ohiovevqbpms4pguh82fnde7tvo9cqnb.apps.googleusercontent.com',
                                'scope': 'https://www.googleapis.com/auth/drive.metadata.readonly',
                            }).then(() => {
                                // console.log("gapi.client.init callback")
                                global.GoogleAuth = global.gapi.auth2.getAuthInstance();

                                global.GoogleAuth.isSignedIn.listen(() => { console.log("sign-in state 변화 감지..") })

                                //return global.GoogleAuth.signIn()
                            })
                            // .then(GoogleUser => {
                            //     console.log("@@ 현재 로그인 토큰 = " + GoogleUser.getAuthResponse().id_token)
                            // })
                        }
                    },
                    onerror: function () {
                        // Handle loading error.
                        alert('gapi.client failed to load!');
                    },
                    timeout: 5000, // 5 seconds.
                    ontimeout: function () {
                        // Handle timeout.
                        alert('gapi.client could not load in a timely manner!');
                    }
                });
            }
        },


        setLogin: (user, id_token) => {
            app.user = user;
            app.user.token = id_token;
            app.state.userID = user.id;
            let enc = app.Base64Encode(JSON.stringify(app.user))

            // 쿠키 만료일을 한달 후로 지정
            let month = 1000 * 60 * 60 * 24 * 30;
            let exp = new Date(app.user.exp * 1000 + month).toUTCString();
            document.cookie = `user=${enc}; expires=${exp}; path=/`;

            sessionStorage.setItem("user", JSON.stringify(app.user));
        },

        isLogin: () => {
            if (app.state.userID) {
                if (isExpired(app.user.exp * 1000)) {
                    //console.log("### jwt token expired");
                    //app.auth.signOut();
                    //app.state.userID = "";

                    // alert && alert("로그인 세션이 만료되었습니다");
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        },

        signOut: () => {
            // 애플리케이션 로그아웃처리
            
            global.document.cookie = "user="
            global.sessionStorage.setItem("user", "");
            app.user = {
                id: "",
                name: "",
                email: "",
                image: "",
                token: ""
            };
            app.state.userID = "";

            // 구글 로그아웃처리
            //let GoogleAuth = gapi.auth2.getAuthInstance();
            // if(global.GoogleAuth){
            //     global.GoogleAuth.signOut().then(() => {
            //         console.log("GoogleAuth.signOut() 완료 후 콜백");
            //     });    
            // }

            global.GoogleAuth?.signOut().then(() => {
                console.log("GoogleAuth.signOut() 완료 후 콜백");
            });    

        }
    }
}
