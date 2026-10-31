# Clean, paired Japanese example sentences and Vietnamese translations ("<JP> — <VI>")
# Each example is on a single line; multiple examples for the same grammar point are separated by "\n".

BAN_1_JAPANESE_EXAMPLES = {
    "~うちに...(1)": (
        "日本にいるうちに、一度富士山に登ってみたい。 — Nhân lúc đang còn ở Nhật thì tôi muốn 1 lần leo núi Phú Sĩ."
    ),
    "~うちに... (2)": (
        "本を読んでいるうちに、眠ってしまった。 — Trong khi đang đọc sách thì tôi đã ngủ quên mất."
    ),
    "あいだ / ～間。。。": (
        "旅行で留守の間、うちの犬の世話を頼めない？ — Trong khi tôi đi du lịch vắng nhà thì cậu có thể trông con chó giúp tớ được không?"
    ),
    "あいだに / ～間に。。。": (
        "私が寝ている間に、泥棒が入った。 — Trong khi tôi đang ngủ thì trộm lẻn vào nhà."
    ),
    "Ｖてからでないと / Ｖてからでなけれ / ば。": (
        "母に相談してからでないと、返事はできません。 — Nếu chưa hỏi ý kiến của mẹ thì em không thể đồng ý được."
    ),
    "Ｖるところ / Ｖているところ / Ｖたところ / ところ＋（助詞）": (
        "ご飯を食べるところです。 — Đang chuẩn bị ăn (hành động ăn chưa diễn ra).\n"
        "ご飯を食べているところです。 — Đang ăn (hành động ăn đang diễn ra).\n"
        "ご飯を食べたところです。 — Vừa mới ăn xong (hành động ăn vừa diễn ra).\n"
        "タバコを吸っているところを先生に見られた。 — Đang lúc hút thuốc thì bị giáo viên nhìn thấy (dùng trợ từ を vì động từ theo sau là 見ます)."
    ),
    "とおりだ。 / とおり（に） / どおりだ。 / どおり（に）": (
        "警察の指示のとおりに行きました。 — Tôi đã đi theo sự chỉ dẫn của cảnh sát."
    ),
    "~によって / ~によっては": (
        "考え方は人によってそれぞれ違います。 — Cách nghĩ thì tùy thuộc vào mỗi người mà có cảm nhận khác nhau."
    ),
    "~たびに。。。": (
        "母と電話で話すたびに、寂しくて泣いてしまう。 — Cứ mỗi lần nói chuyện qua điện thoại với mẹ thì tôi lại khóc vì nhớ nhà."
    ),
    "(Thể đk) + ほど": (
        "見れば見るほど好きになる。 — Càng nhìn thì càng yêu."
    ),
    "～ついでに。。。": (
        "散歩のついでに、晩ご飯の買い物をした。 — Nhân tiện khi đi dạo thì tôi mua luôn đồ về nấu cơm."
    ),
    "くらい...はない / ぐらい...はない / ほど...はない": (
        "漢字の勉強ほど退屈なものはない。 — Không có việc gì chán hơn là học Kanji.\n"
        "恋人と一緒にいることほど幸せなことはない。 — Không có gì hạnh phúc hơn là việc được ở bên cạnh người yêu."
    ),
    "くらいだ・くらい / ぐらいだ・ぐらい / ほどだ・ほど": (
        "この店のケーキは、毎日でも食べたいくらい美味しい。 — Bánh ở cửa hàng này rất ngon, ngon tới mức ngày nào cũng muốn ăn."
    ),
    "～くらいなら / ～ぐらいなら": (
        "好きでもない人と結婚するくらいなら、ずっと独身でいるほうがましだ。 — Nếu mà phải lấy người mình không yêu thì thà cứ mãi độc thân như thế này còn hơn."
    ),
    "～に限る": (
        "インフルエンザが流行っているときは、人混みに行かないに限る。 — Khi đang có dịch cúm thì tốt nhất là không đến chỗ đông người."
    ),
    "～に対して": (
        "ハノイが凍えるほど寒いのに対して、ホーチミンは汗が出るほど暑い。 — Bây giờ ở Hà Nội đang lạnh tê tái còn TP.HCM thì đang nóng đổ mồ hôi."
    ),
    "～反面": (
        "都会の生活は楽しいことが多い反面、ストレスも多い。 — Cuộc sống ở thành thị thì có nhiều thứ vui nhưng mặt khác lại có nhiều áp lực."
    ),
    "～一方（で）": (
        "会議では、自分の意見を主張する一方で、他人の意見にも耳を傾けなければならない。 — Trong cuộc họp, ngoài việc nói lên ý kiến của bản thân thì đồng thời cũng phải lắng nghe ý kiến của người khác."
    ),
    "A というより B": (
        "今日は涼しいというより、むしろ寒いくらいだ。 — Dự báo thời tiết hôm nay mát nhưng nói là lạnh thì đúng hơn là mát."
    ),
    "Ａ ～かわりに Ｂ": (
        "ランさんに英語を教えてもらうかわりに、私は彼女の仕事を手伝っている。 — Đổi lại việc Lan giúp tôi học tiếng Anh thì tôi giúp đỡ Lan trong công việc."
    ),
    "A ためだ B / A ため（に）B": (
        "出張のため、本日の会議を欠席させていただきます。 — Vì phải đi công tác nên tôi xin phép vắng mặt trong buổi họp hôm nay."
    ),
    "(A) によって (B) / (A )による＋Ｎ(B) [Do A ...nên B]": (
        "強い風によって、大きな木が倒れてしまった。 — Vì trận gió lớn mà cây cổ thụ đã bị đổ."
    ),
    "(A) によって (B) / (A )による＋Ｎ(B) [Bằng cách, nhờ có]": (
        "インターネットによって、多くの無料情報を集めることができる。 — Nhờ có internet mà con người có thể thu thập được nhiều thông tin miễn phí."
    ),
}

BAN_2_CLEAN_EXAMPLES = {
    "～（の）なら": (
        "彼女のことがそんなに嫌いなら別れたらいい。 — Nếu đã ghét cô ấy như thế rồi thì nên chia tay đi."
    ),
    "V ては / ～（の）では": (
        "山田さんは手術したばかりだから、お見舞いに行ってはかえって迷惑だろう。 — Anh Yamada vì vừa mới phẫu thuật xong nên nếu mà đi thăm thì ngược lại sẽ làm phiền anh ấy."
    ),
    "Thể điều kiện": (
        "お金と暇があれば私も海外旅行するんだけど。 — Nếu có tiền và thời gian rảnh thì chắc chắn tôi sẽ đi du lịch nước ngoài nhưng mà…"
    ),
    "～さえ～ば / ～さえ～なら": (
        "君さえそばにいれば、他には何もいりません。 — Chỉ cần có em bên cạnh anh là đủ, ngoài ra không cần gì khác."
    ),
    "たとえ～ても": (
        "たとえ両親に反対されても、彼と結婚します。 — Cho dù bố mẹ có phản đối thế nào đi nữa thì con vẫn sẽ kết hôn với anh ấy."
    ),
    "～ということだ。 / ～とのことだ.": (
        "市のお知らせによれば、この道路は来週から工事が始まるということです。 — Theo như thông báo của thành phố, con đường này từ tuần sau sẽ bắt đầu khởi công."
    ),
    "～と言われている": (
        "納豆は体にいいと言われている。 — Nghe nói đậu phụ lên men (Natto) rất tốt cho sức khỏe."
    ),
    "～とか": (
        "彼女は来年結婚なさるとか。 — Thấy bảo là năm sau cô ấy sẽ lấy chồng."
    ),
    "～って": (
        "さとうさんの奥さんは英語の先生だって。 — Nghe nói vợ của anh Satou là giáo viên dạy tiếng Anh.\n"
        "これって何？ — Cái này là cái gì thế?"
    ),
    "～という": (
        "このあたりは昔、広い野原(のはら)だったという。 — Nghe nói vùng này ngày xưa đã từng là cánh đồng thảo nguyên rộng lớn."
    ),
    "～はずがない / ～わけがない": (
        "こんなに大きい家、私に買えるわけがないでしょう。 — Ngôi nhà to như thế này thì đối với tôi chắc chắn là không thể mua được."
    ),
    "～とは限らない": (
        "新聞に書いてあることがいつも本当のこと（だ）とは限らない。 — Những việc được viết trên báo chưa chắc lúc nào cũng là sự thật."
    ),
    "～わけではない / ～というわけでは / ない / ～のではない": (
        "この仕事が好き（だ）というわけではないが、彼と一緒に仕事ができて楽しい。 — Công việc này, không phải là tôi thích nó mà là vì được làm việc với anh ấy nên tôi rất vui."
    ),
    "ないことはない": (
        "この料理も美味しくないことはないが、私はもっと辛いのが好きだ。 — Món ăn này không phải là không ngon nhưng tôi thích nó cay hơn một chút."
    ),
    "～ことは～が…": (
        "彼女のことは好きなことは好きだけど、結婚したいほどじゃないよ。 — Nói là thích cô ấy thì thật ra cũng thích thật nhưng mà chưa đến mức muốn kết hôn."
    ),
    "～もらいたい / ～いただきたい / ～欲しい [Muốn ai đó làm]": (
        "誰かに自分の悩みを聞いてもらいたいと思うことがあります。 — Cũng có lúc tôi muốn ai đó có thể lắng nghe những phiền muộn của mình."
    ),
    "～もらいたい / ～いただきたい / ～欲しい [Mong muốn được cho phép]": (
        "今日は急に用事があるので、早く帰らせていただきたいんですが… — Vì hôm nay em có việc đột xuất nên em muốn xin phép sếp cho em về sớm…"
    ),
    "～いい [Mong rằng]": (
        "明日は入学試験だ。頑張ろう。合格できたらいいなあ。 — Ngày mai thi tuyển sinh rồi, cùng cố gắng nhé. Mong rằng chúng ta sẽ đỗ."
    ),
    "～いい [Nên]": (
        "その仕事、気が進まないのなら引き受けなければいいんじゃないですか。 — Nếu không hứng thú với công việc đó thì chẳng phải cậu không nhận là được hay sao?"
    ),
    "Thể mệnh lệnh": (
        "赤信号は止まれという意味です。 — Đèn đỏ có nghĩa là phải dừng lại."
    ),
    "Thể cấm chỉ": (
        "父は医者にお酒を飲むなと言われている。 — Bố tôi bị bác sĩ dặn là không được uống rượu."
    ),
    "～こと": (
        "申込書を書く前に注意書きをよく読むこと。 — Trước khi viết đơn đăng ký thì phải đọc kỹ phần lưu ý."
    ),
    "～べきだ。べき / ではない。": (
        "せっかく入った会社なのだから、簡単に辞めるべきではない。 — Vì mất rất nhiều công sức mới vào được công ty nên không nên dễ dàng nghỉ việc như vậy.\n"
        "明日までのレポートがまだ書き終わらない。もっと早くから始めるべきだった。 — Báo cáo hạn ngày mai mà giờ vẫn chưa viết xong, đáng lẽ mình nên bắt đầu sớm hơn."
    ),
    "～らどうか": (
        "体のことが心配なら、一度健康診断を受けたらどうでしょうか。 — Nếu lo lắng về sức khỏe thì bạn thử đi khám sức khỏe một lần xem sao?\n"
        "悪いのはそっちですよ。一言謝(あやま)ったらどうですか。 — Người có lỗi là đằng ấy đấy, cậu không định nói xin lỗi một lời hay sao?"
    ),
    "～ことにする。 / ～ことにしてい / る。": (
        "これから甘いものは食べないことにする。 — Từ bây giờ tôi quyết định sẽ không ăn đồ ngọt nữa.\n"
        "毎朝30分ジョギングすることにしています。 — Tôi đang duy trì quyết định chạy bộ 30 phút mỗi sáng."
    ),
    "～ようにする。 / ～ようにしてい / る。": (
        "水や電気は大切に使うようにしましょう。 — Hãy cùng nhau cố gắng sử dụng tiết kiệm điện và nước.\n"
        "健康のために野菜を食べるようにしています。 — Vì sức khỏe nên tôi đang cố gắng ăn nhiều rau."
    ),
    "～(よ)うとする": (
        "あの子は一生懸命手を伸ばして、テーブルの上のおもちゃを取ろうとしている。 — Đứa trẻ kia đang cố gắng vươn tay để lấy món đồ chơi trên mặt bàn.\n"
        "家を出ようとしたとき、突然大雨が降りだした。 — Khi tôi đang chuẩn bị bước ra khỏi nhà thì đột nhiên trời đổ mưa to.\n"
        "父に事情を説明しようとしたが、父は話を聞こうとはしなかった。 — Tôi đã cố giải thích sự tình cho bố nhưng bố hoàn toàn không chịu lắng nghe."
    ),
    "～つもりだ": (
        "冗談で言ったつもりの言葉だったが、彼は怒ったような顔をした。 — Tôi cứ nghĩ đó chỉ là lời nói đùa thôi nhưng anh ấy lại tỏ vẻ mặt rất tức giận.\n"
        "先生はハンサムなつもりかもしれないが、実はそうハンサムではない。 — Thầy giáo có lẽ cứ tưởng là mình đẹp trai nhưng thực ra cũng không đẹp đến mức đó đâu."
    ),
    "尊敬語（そんけいご） - Tôn kính ngữ": (
        "社長はもうお帰りになりました。 — Giám đốc đã về rồi.\n"
        "先生がそうおっしゃいました。 — Thầy giáo đã nói như thế."
    ),
    "謙譲語（けんじょうご） - Khiêm nhường ngữ": (
        "私がご案内いたします。 — Tôi xin phép được hướng dẫn quý khách.\n"
        "明日、会社へ伺います。 — Ngày mai tôi sẽ đến công ty."
    ),
    "丁寧語（ていねいご） - Từ lịch sự": (
        "雨が降っています。 — Trời đang mưa.\n"
        "こちらが受付でございます。 — Đây là quầy tiếp tân."
    ),
}
