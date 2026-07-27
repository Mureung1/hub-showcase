public class GameManager
{
    private PlayerController player;
    private int score;

    public void AddScore(int amount)
    {
        score += amount;
    }

    public void ResetGame()
    {
        score = 0;
        player.transform.position = Vector3.zero;
    }
}
