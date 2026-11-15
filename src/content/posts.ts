// All of Alex's posts, organized by story act and question/answer branch.
// Captions, comments and timestamps are exact copies of the story document.
// Images come from assets/post_assets and are bundled by Vite.

export type Branch = 'a' | 'b' | 'c';
export type QuestionId = 'q1' | 'q2' | 'q3';

export interface PostComment {
  user: string;
  text: string;
}

export interface Post {
  id: string; // 'p01' ... 'p05' (shared), 'p06a' ... 'p14c' (branch)
  act: 1 | 2 | 3 | 4;
  /** Present only on branch posts. */
  questionId?: QuestionId;
  branch?: Branch;
  image: string;
  alt: string;
  caption: string;
  comments: PostComment[];
  timestamp: string;
}

export interface Answer {
  branch: Branch;
  label: string;
  posts: Post[]; // 3 reinforcing posts, in feed order
}

export interface Question {
  id: QuestionId;
  /** Asked after the last post of the previous group (p05 for q1, p08x for q2, p11x for q3). */
  afterPostId: string;
  /** Short description of what the question asks about, for the observation screen. */
  topic: string;
  prompt: string;
  answers: Answer[];
}

const images = import.meta.glob('../../assets/post_assets/img-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function img(id: string): string {
  const key = id.replace(/^p0?/, ''); // p06a -> 6a, p10c -> 10c, p01 -> 1
  const src = images[`../../assets/post_assets/img-${key}.jpg`];
  if (!src) throw new Error(`Missing image for post ${id}`);
  return src;
}

type Raw = Pick<Post, 'timestamp' | 'alt' | 'caption' | 'comments'>;

const c = (user: string, text: string): PostComment => ({ user, text });

function build(
  id: string,
  act: Post['act'],
  raw: Raw,
  questionId?: QuestionId,
  branch?: Branch
): Post {
  return { id, act, questionId, branch, image: img(id), ...raw };
}

// ---------------------------------------------------------------- Act 1
export const sharedPosts: Post[] = [
  build('p01', 1, {
    timestamp: 'Three weeks ago',
    alt: 'Alex and Jamie in graduation gowns, laughing with their arms around each other',
    caption: 'my ride or die <3',
    comments: [
      c('jamie.bear', 'love you alexieee ♥︎'),
      c('priya.shah', 'so cute!'),
      c('mayassocool', 'power duo frr'),
    ],
  }),
  build('p02', 1, {
    timestamp: 'Fifteen days ago',
    alt: 'Priya working late at night in the design studio',
    caption: 'running on 3 hours of sleep rn',
    comments: [
      c('priya.shah', 'but projects looking fire'),
      c('jamie.bear', 'genuinely the smartest person i know'),
    ],
  }),
  build('p03', 1, {
    timestamp: 'Two weeks ago',
    alt: 'A blurry night photo of a group of friends hanging out',
    caption: 'smores cookies just hit different at 3am',
    comments: [
      c('jamie.bear', 'personally prefer the snickers cookie but wtv. save room for my bday cake friday'),
      c('charliev', 'bros livin it up'),
    ],
  }),
  build('p04', 1, {
    timestamp: 'Four days ago',
    alt: 'A coffee shop',
    caption: 'freshman year flashback :(',
    comments: [c('lillybilly', 'omgg i remember this place!!! miss u cutiee, see u at jamie\'s bday friday')],
  }),
  build('p05', 1, {
    timestamp: 'Friday night',
    alt: 'A cozy, dim living room with a sitcom on the TV',
    caption: 'genuinely just wanted to rot today',
    comments: [],
  }),
];

// ---------------------------------------------------------------- Act 2 (q1)
const q1: Question = {
  id: 'q1',
  afterPostId: 'p05',
  topic: 'Why she stayed home on Jamie’s birthday',
  prompt: 'Wasn’t it Jamie’s birthday on Friday? Why’s Alex at home?',
  answers: [
    {
      branch: 'a',
      label: 'Maybe she isn’t feeling well',
      posts: [
        build('p06a', 2, {
          timestamp: 'Saturday night',
          alt: 'The design studio, dark and empty with Alex alone',
          caption: 'design studio’s sucking the life outta me',
          comments: [
            c('jamie.bear', 'college too hard sometimes'),
            c('priya.shah', 'girl we literally live here now'),
          ],
        }, 'q1', 'a'),
        build('p07a', 2, {
          timestamp: 'Sunday morning',
          alt: 'A green smoothie held up against a city background',
          caption: 'need a physical and digital detox',
          comments: [c('jamie.bear', 'yooo finally took my recc')],
        }, 'q1', 'a'),
        build('p08a', 2, {
          timestamp: 'Monday evening',
          alt: 'Alex dressed up and smiling, ready to present at a design exhibition',
          caption: 'taking the best nap of my life after this',
          comments: [
            c('priya.shah', 'grind was worth it tho'),
            c('jamie.bear', 'so proud of you alex!!'),
          ],
        }, 'q1', 'a'),
      ],
    },
    {
      branch: 'b',
      label: 'Something might’ve happened between them',
      posts: [
        build('p06b', 2, {
          timestamp: 'Saturday night',
          alt: 'Alex, Jamie and two friends baking in Jamie’s kitchen',
          caption: 'missing the good old days',
          comments: [c('mayassocool', 'wait i remember this 😭')],
        }, 'q1', 'b'),
        build('p07b', 2, {
          timestamp: 'Sunday morning',
          alt: 'Alex and friends at a brunch place, without Jamie',
          caption: 'me and my girls!',
          comments: [
            c('sophie_lovebug', 'so whats next on the bucket list??'),
            c('vivianhuang', 'those hashbrowns were sublime'),
          ],
        }, 'q1', 'b'),
        build('p08b', 2, {
          timestamp: 'Monday evening',
          alt: 'Alex and Priya standing together, ready to present at the exhibition',
          caption: '@priya.shah you da goattt',
          comments: [c('priya.shah', 'grind was worth it tho 🔥')],
        }, 'q1', 'b'),
      ],
    },
    {
      branch: 'c',
      label: 'She might be busy with other things',
      posts: [
        build('p06c', 2, {
          timestamp: 'Saturday night',
          alt: 'Homework, an energy drink and a computer on a desk in a dimly lit room',
          caption: 'generational lock-in',
          comments: [],
        }, 'q1', 'c'),
        build('p07c', 2, {
          timestamp: 'Sunday morning',
          alt: 'A selfie of Alex on her morning run',
          caption: 'pulled my first all-nighter',
          comments: [c('mayassocool', 'girl go to sleep 😭')],
        }, 'q1', 'c'),
        build('p08c', 2, {
          timestamp: 'Monday evening',
          alt: 'Priya, Jamie and Alex together at the design exhibition',
          caption: 'so grateful for these people',
          comments: [
            c('priya.shah', 'grind was worth it tho 🔥'),
            c('jamie.bear', 'so proud of you alex!!'),
          ],
        }, 'q1', 'c'),
      ],
    },
  ],
};

// ---------------------------------------------------------------- Act 3 (q2)
const q2: Question = {
  id: 'q2',
  afterPostId: 'p08', // last post of the q1 branch (p08a / p08b / p08c)
  topic: 'Why she was so stressed before the exhibition',
  prompt: 'Well, her exhibition seems to have gone well, so why was she so stressed before?',
  answers: [
    {
      branch: 'a',
      label: 'She might not like studying design',
      posts: [
        build('p09a', 3, {
          timestamp: 'Tuesday',
          alt: 'A beach at sunset',
          caption: 'let’s go to the beach please',
          comments: [
            c('sophie_lovebug', 'SAY WHEN'),
            c('mayassocool', 'girl we have class tomorrow 😭'),
            c('jamie.bear', 'spring break needs to hurry up'),
          ],
        }, 'q2', 'a'),
        build('p10a', 3, {
          timestamp: 'Thursday evening',
          alt: 'Alex and friends eating popsicles in Hawaiian leis outside',
          caption: 'counting down the days to break',
          comments: [
            c('vivianhuang', 'the vacation we desperately needed'),
            c('sophie_lovebug', 'why do we look like tourists in our own city'),
          ],
        }, 'q2', 'a'),
        build('p11a', 3, {
          timestamp: 'Friday night',
          alt: 'Alex and friends, including Jamie, dressed up for the club',
          caption: 'golden years fr',
          comments: [
            c('jamie.bear', 'MY GIRLSSS'),
            c('sophie_lovebug', 'we need a part 2 immediately'),
            c('vivianhuang', 'my feet still hurt 💀'),
          ],
        }, 'q2', 'a'),
      ],
    },
    {
      branch: 'b',
      label: 'She was probably just overwhelmed',
      posts: [
        build('p09b', 3, {
          timestamp: 'Tuesday',
          alt: 'Alex and Jamie at a table with a small slice of cake between them',
          caption: 'she saved me a slice of cake 😭',
          comments: [c('jamie.bear', "wouldn't let u miss out on my cake duh")],
        }, 'q2', 'b'),
        build('p10b', 3, {
          timestamp: 'Thursday evening',
          alt: 'Alex and friends getting cookies late at night',
          caption: 'missed our sidequests yall',
          comments: [c('sophie_lovebug', 'we were literally supposed to go home an hour ago')],
        }, 'q2', 'b'),
        build('p11b', 3, {
          timestamp: 'Friday night',
          alt: 'Alex dressed in country style to go line dancing',
          caption: 'i finally got them apple bottom jeans 🍎',
          comments: [
            c('mayassocool', 'SHE GOT THE BOOTS TOO YALL'),
            c('jamie.bear', 'yeehawww 🤠'),
          ],
        }, 'q2', 'b'),
      ],
    },
    {
      branch: 'c',
      label: 'It could be some kind of other drama going on',
      posts: [
        build('p09c', 3, {
          timestamp: 'Tuesday',
          alt: 'Alex and Maya posed like the first photo of Alex and Jamie, in a new setting',
          caption: '@mayassocool it’s you and me forever girl',
          comments: [c('mayassocool', 'MY DAY ONEEEE')],
        }, 'q2', 'c'),
        build('p10c', 3, {
          timestamp: 'Thursday evening',
          alt: 'Alex at a semi-professional event with people we haven’t seen before',
          caption: 'might’ve yapped a little too much',
          comments: [
            c('ethanchoi', 'networking final boss'),
            c('ryan.k', 'bro did NOT stop talking 😭'),
          ],
        }, 'q2', 'c'),
        build('p11c', 3, {
          timestamp: 'Friday night',
          alt: 'Alex in the center with three guys, all dressed up for the club',
          caption: 'at least i didn’t peak in high school',
          comments: [
            c('ethanchoi', 'legendary night'),
            c('noahw', "we're never going back to that place 💀"),
          ],
        }, 'q2', 'c'),
      ],
    },
  ],
};

// ---------------------------------------------------------------- Act 4 (q3)
const q3: Question = {
  id: 'q3',
  afterPostId: 'p11', // last post of the q2 branch (p11a / p11b / p11c)
  topic: 'Why she was missing from class',
  prompt: 'Wow okay Alex seems to be living the life. I haven’t seen her in class though.',
  answers: [
    {
      branch: 'a',
      label: 'I guess she’s just skipping',
      posts: [
        build('p12a', 4, {
          timestamp: 'Monday afternoon',
          alt: 'A candid of Alex looking surprised and laughing while drinking a coffee',
          caption: 'saw my TA out in the wild 😶‍🌫️',
          comments: [c('mayassocool', 'DID HE RECOGNIZE U 😭')],
        }, 'q3', 'a'),
        build('p13a', 4, {
          timestamp: 'Tuesday night',
          alt: 'Alex and friends in the Taco Bell drive-through',
          caption: '20 absences later and im still standing',
          comments: [c('sophie_lovebug', 'academic comeback starts tomorrow trust')],
        }, 'q3', 'a'),
        build('p14a', 4, {
          timestamp: 'Wednesday morning',
          alt: 'Alex holding out a test paper with a cheeky smile',
          caption: 'Cs get degrees',
          comments: [
            c('mayassocool', 'GIRL BYEEE 💀'),
            c('priya.shah', 'at least u passed queen'),
          ],
        }, 'q3', 'a'),
      ],
    },
    {
      branch: 'b',
      label: 'She’s probably got a full-time offer after grad',
      posts: [
        build('p12b', 4, {
          timestamp: 'Monday afternoon',
          alt: 'An old picture of Alex in LA',
          caption: 'cali’s calling',
          comments: [
            c('jamie.bear', 'take me with uuu'),
            c('sophie_lovebug', 'wait are u going back??'),
          ],
        }, 'q3', 'b'),
        build('p13b', 4, {
          timestamp: 'Tuesday night',
          alt: 'Alex and friends at Zilker Park',
          caption: 'already missing it and i haven’t even left yet',
          comments: [
            c('mayassocool', "girl don't leave me yet 😭"),
            c('jamie.bear', 'not us getting sentimental already'),
          ],
        }, 'q3', 'b'),
        build('p14b', 4, {
          timestamp: 'Wednesday morning',
          alt: 'A baby photo of Alex with her parents',
          caption: 'found a gem',
          comments: [c('mayassocool', 'WHY DO U LOOK EXACTLY THE SAME')],
        }, 'q3', 'b'),
      ],
    },
    {
      branch: 'c',
      label: 'She’s just naturally smart',
      posts: [
        build('p12c', 4, {
          timestamp: 'Monday afternoon',
          alt: 'Alex and a friend laughing together in class',
          caption: 'first A streak of my college career',
          comments: [
            c('priya.shah', 'academic comeback of the century'),
            c('jamie.bear', 'proud of u smarty pants'),
          ],
        }, 'q3', 'c'),
        build('p13c', 4, {
          timestamp: 'Tuesday night',
          alt: 'Alex and Jamie studying in a busy library with whiteboards and booths',
          caption: 'what starts on pcl 5th floor changes the world',
          comments: [
            c('jamie.bear', 'pcl 5th floor trauma bonding fr'),
            c('priya.shah', 'the whiteboard was fighting for its life'),
          ],
        }, 'q3', 'c'),
        build('p14c', 4, {
          timestamp: 'Wednesday morning',
          alt: 'Alex holding a ribbon she received at the design exhibition',
          caption: 'academic weapon?',
          comments: [
            c('priya.shah', 'ACADEMIC WEAPONS FRRR'),
            c('jamie.bear', 'THAT’S MY GIRL'),
            c('mayassocool', 'never doubted u for a second (maybe once)'),
          ],
        }, 'q3', 'c'),
      ],
    },
  ],
};

// ---------------------------------------------------------------- Lookups
export const questions: Question[] = [q1, q2, q3];

export const questionsById: Record<QuestionId, Question> = { q1, q2, q3 };

export const allPosts: Post[] = [
  ...sharedPosts,
  ...questions.flatMap((q) => q.answers.flatMap((a) => a.posts)),
];

export const postsById: Record<string, Post> = Object.fromEntries(
  allPosts.map((p) => [p.id, p])
);

/** The three posts shown after the user picks `branch` on question `questionId`. */
export function getPostsFor(questionId: QuestionId, branch: Branch): Post[] {
  const answer = questionsById[questionId].answers.find((a) => a.branch === branch);
  return answer ? answer.posts : [];
}
