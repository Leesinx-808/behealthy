import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, imageBase64, profile, todaySummary, budgetMode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `你是一个贴心、专业且接地气的马来西亚本地营养与运动私人教练。
当前用户档案：
- 昵称：${profile.display_name || '朋友'}，性别：${profile.gender === 'male' ? '男' : '女'}，${profile.age}岁，身高${profile.height_cm}cm，体重${profile.weight_kg}kg
- 目标：${profile.goal_type === 'gain' ? '增重增肌' : profile.goal_type === 'lose' ? '健康减脂' : '维持体态'}
- 每日目标：热量 ${profile.target_calories} kcal，蛋白质 ${profile.target_protein}g，碳水 ${profile.target_carbs}g，脂肪 ${profile.target_fat}g
- 喜欢的食物：${profile.preferences || '无特殊偏好'}
- 忌口与雷区（绝对避开）：${profile.dislikes || '无'}
- 当前模式：${budgetMode ? '省钱平价模式（优先推荐家常菜、杂饭、鸡蛋、牛奶等高性价比选择）' : '常规模式'}
- 今日已累计：摄入 ${todaySummary.inCalories} kcal，运动消耗 ${todaySummary.outCalories} kcal，已吃蛋白质 ${todaySummary.protein}g

任务要求：
1. 根据用户发来的文字描述和/或食物/运动截图，精准估算热量和三大营养素（结合马来西亚本地饮食习惯，如 Nasi Kandar、炒粿条、美禄、苏打饼等，并自动遵守用户的忌口习惯如不吃蒸鸡皮等）。
2. 如果是运动记录（如步行、跑步、打球截图），log_type 设为 "workout"，calories 填消耗的净大卡数（正整数），蛋白质/碳水/脂肪填 0。
3. 结合用户当前剩余的热量和蛋白质缺口，给出一句温暖、具体、可执行的下一步饮食/运动建议与鼓励。

严格以纯 JSON 格式返回（不要包含 markdown 代码块标记）：
{
  "log_type": "meal" 或 "workout",
  "title": "简短食物或运动名称（12字以内）",
  "calories": 整数,
  "protein": 整数,
  "carbs": 整数,
  "fat": 整数,
  "coach_reply": "针对这顿饭/这次运动的简短评价 + 结合今日剩余缺口的下一步建议与鼓励（80字以内）"
}`;

    const contents = [];
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }
    contents.push(text || '请帮我分析这张照片的热量与营养数据');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'AI 分析失败，请稍后重试或检查 API Key' });
  }
}
